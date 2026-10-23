const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { JSDOM } = require("jsdom");
const { Script } = require("node:vm");

// Every fixture is synthetic. Never capture BMW responses in this directory.
const root = join(__dirname, "..");
const en = JSON.parse(readFileSync(join(root, "translations/en.json"), "utf8"));
const baseData = { mileage_km: 12345, last_update: "2000-01-02T12:00:00Z" };

function harness(overrides = {}) {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
    const { window } = dom;
    const timers = new Map();
    const logs = [];
    let timerId = 0;
    let definition;
    window.setTimeout = (callback, delay) => {
        const id = ++timerId;
        timers.set(id, { callback, delay });
        return id;
    };
    window.clearTimeout = id => timers.delete(id);
    window.Log = { error: message => logs.push(message) };
    window.config = { language: "en" };
    window.Module = { register: (_name, value) => { definition = value; } };
    const load = path => new Script(readFileSync(join(root, path), "utf8")).runInContext(dom.getInternalVMContext());
    load("MMM-BMWCD.js");
    const instance = Object.assign({}, definition, {
        config: { ...definition.defaults, view: "full", ...overrides },
        vehicleData: null, error: null, timer: null, controller: null,
        locale: "en", suspended: false,
        file: path => `/mirror/modules/MMM-BMWCD/${path}`,
        translate: key => en[key] || key,
        updates: 0,
        updateDom(speed) { assert.equal(speed, 0); this.updates++; },
    });
    for (const script of instance.getScripts()) {
        assert.ok(script.startsWith("/mirror/modules/MMM-BMWCD/lib/"));
        load(script.slice("/mirror/modules/MMM-BMWCD/".length));
    }
    const render = (data = baseData, options = {}) => window.BMWCD.render({
        data, error: null, options: instance.config, translate: instance.translate,
        locale: "en", imageSrc: null, ...options,
    });
    return { window, instance, render, timers, logs, close: () => dom.window.close() };
}

test("legacy ICE, BEV and PHEV data render without duplicate ranges", () => {
    const h = harness();
    try {
        const ice = h.render({ ...baseData, range_km: 500, range_fuel_km: 500, fuel_level_pct: 50, doors_locked: "LOCKED" });
        assert.match(ice.querySelector('[data-field="doors"]').textContent, /Locked/);
        assert.equal(ice.querySelectorAll('[data-field="range_fuel"]').length, 0);
        assert.equal(ice.querySelectorAll('[data-field="battery"]').length, 0);
        const bev = h.render({ ...baseData, range_electric_km: 300, battery_soc_pct: 0, is_plugged_in: false });
        assert.match(bev.querySelector('[data-field="range"]').textContent, /300 km/);
        assert.match(bev.querySelector('[data-field="plug"]').textContent, /Disconnected/);
        assert.equal(bev.querySelector(".bmwcd-bar-fill").style.width, "0%");
        const phev = h.render({ ...baseData, range_km: 650, range_electric_km: 50, range_fuel_km: 600 });
        assert.match(phev.querySelector('[data-field="range_electric"]').textContent, /50 km/);
        assert.match(phev.querySelector('[data-field="range_fuel"]').textContent, /600 km/);
    } finally { h.close(); }
});

test("missing values, partial tyres and unknown states never invent vehicle state", () => {
    const h = harness();
    try {
        const dom = h.render({ last_update: baseData.last_update, tire_pressure_fr_kpa: 240,
            tire_pressure_target_fr_kpa: 250, doors_locked: "ASN_isUnknown" });
        assert.equal(dom.querySelector('[data-field="mileage"]'), null);
        assert.match(dom.querySelector('[data-field="doors"]').textContent, /Unknown/);
        assert.equal(dom.querySelector('[data-field="doors"] .bmwcd-red'), null);
        assert.match(dom.querySelector('[data-field="tires"]').textContent, /2.4 \/ 2.5 bar/);
        assert.doesNotMatch(dom.textContent, /NaN|undefined|Invalid Date/);
        assert.match(h.render({ ...baseData, doors_locked: "SECURED" }).textContent, /Locked/);
        const invalid = h.render({ ...baseData, mileage_km: "oops", battery_soc_pct: Infinity });
        assert.equal(invalid.querySelector('[data-field="mileage"]'), null);
        assert.equal(invalid.querySelector('[data-field="battery"]'), null);
        const overfull = h.render({ ...baseData, battery_soc_pct: 120 });
        assert.equal(overfull.querySelector(".bmwcd-bar-fill").style.width, "100%");
    } finally { h.close(); }
});

test("expanded fields retain false, zero, BMW units and service distance strings", () => {
    const h = harness();
    try {
        const dom = h.render({ ...baseData, door_front_left_open: false, hood_open: true,
            window_front_left_status: "CLOSED", alarm_active: false, alarm_armed_status: "ARMED",
            preconditioning_status: "ACTIVE", preconditioning_remaining_min: 0,
            battery_voltage_v: 12.4, coolant_temperature: 100, is_engine_on: false,
            charging_status: "CHARGING", charging_time_remaining_min: 0,
            service_messages: [{ title: "Synthetic service", status: "PENDING", date: "null", unitOfLengthRemaining: "12345" }],
            telematic_data: { "vehicle.drivetrain.internalCombustionEngine.engine.ect": { value: "100", unit: "K" } },
        });
        assert.match(dom.querySelector('[data-field="openings"]').textContent, /Closed/);
        assert.match(dom.querySelector('[data-field="hood"]').textContent, /Open/);
        assert.match(dom.querySelector('[data-field="alarm"] .bright').textContent, /Armed/);
        assert.match(dom.querySelector('[data-field="climate"]').textContent, /0 min/);
        assert.match(dom.querySelector('[data-field="coolant"]').textContent, /100 K/);
        assert.match(dom.querySelector('[data-field="charging"]').textContent, /0 min left/);
        assert.match(dom.querySelector(".bmwcd-services").textContent, /12,345/);
        assert.doesNotMatch(dom.querySelector(".bmwcd-services").textContent, /12345 km|null/);
    } finally { h.close(); }
});

test("all gateway and config strings render as text", () => {
    const h = harness({ vehicleName: '<img src=x onerror="alert(1)">' });
    try {
        const dom = h.render({ ...baseData, doors_locked: "<script>bad()</script>",
            basic_data: { engine: "<b>test</b>" },
            service_messages: [{ title: "<img src=x>", description: "<svg onload=bad()>" }],
        });
        assert.equal(dom.querySelectorAll("img,script,svg,b").length, 0);
        assert.match(dom.textContent, /<img src=x/);
        assert.equal(h.window.BMWCD.imageSource("javascript:alert(1)", h.instance.file), null);
        assert.equal(h.window.BMWCD.imageSource("car.png", h.instance.file), "/mirror/modules/MMM-BMWCD/car.png");
    } finally { h.close(); }
});

test("source timestamps are displayed without age warnings; connection errors keep cached data", () => {
    const h = harness();
    try {
        const dom = h.render({ ...baseData, telematic_data: {
            a: { value: "0", timestamp: "2000-01-01T12:00:00Z" },
            b: { value: "1", timestamp: "invalid" },
        } });
        assert.match(dom.querySelector(".bmwcd-updated").title, /Latest vehicle reading/);
        assert.equal(dom.querySelector(".bmwcd-notice"), null);
        const cached = h.render(baseData, { error: "CONNECTION_ERROR" });
        assert.match(cached.textContent, /Showing last received data/);
        assert.ok(cached.querySelector('[data-field="mileage"]'));
    } finally { h.close(); }
});

test("GPS and raw telemetry are opt-in; all new field groups can be hidden", () => {
    const h = harness();
    const data = { ...baseData, latitude: 0.25, longitude: 0.75,
        basic_data: { modelName: "Test coupe", engine: "Test engine" },
        service_messages: [{ title: "Test service" }],
        telematic_data: { a: { value: "<test>", unit: "x", timestamp: baseData.last_update } },
    };
    try {
        const off = h.render(data);
        assert.equal(off.querySelector('[data-field="location"]'), null);
        assert.equal(off.querySelector(".bmwcd-telematics"), null);
        assert.match(off.querySelector("h2").textContent, /Test coupe/);
        h.instance.config.showLocation = true;
        h.instance.config.showTelematics = true;
        const on = h.render(data);
        assert.match(on.querySelector('[data-field="location"]').textContent, /0.25, 0.75/);
        assert.match(on.querySelector(".bmwcd-telematics").textContent, /<test> x/);
        h.instance.config.hiddenFields = ["location", "service", "vehicle_details"];
        const hidden = h.render(data);
        assert.equal(hidden.querySelector('[data-field="location"]'), null);
        assert.equal(hidden.querySelector(".bmwcd-services"), null);
        assert.equal(hidden.querySelector(".bmwcd-metadata"), null);
    } finally { h.close(); }
});

test("fetch encodes VIN, trims URL, sends auth and prevents overlapping requests", async () => {
    const h = harness({ bridgeUrl: "http://localhost:8080///", vin: " TEST/VIN ", apiKey: "synthetic-key" });
    try {
        let finish;
        let calls = 0;
        h.window.fetch = async (url, options) => {
            calls++;
            assert.equal(url, "http://localhost:8080/vehicle/TEST%2FVIN");
            assert.equal(options.headers["X-API-Key"], "synthetic-key");
            await new Promise(resolve => { finish = resolve; });
            return { ok: true, json: async () => baseData };
        };
        const pending = h.instance.fetchData();
        await h.instance.fetchData();
        assert.equal(calls, 1);
        finish();
        await pending;
        assert.equal(h.instance.vehicleData, baseData);
        assert.equal(h.timers.size, 1);
        assert.equal([...h.timers.values()][0].delay, 60000);
    } finally { h.close(); }
});

test("HTTP errors, malformed JSON and invalid payloads preserve the cache", async () => {
    const h = harness();
    try {
        h.instance.vehicleData = baseData;
        for (const [status, key] of [[400, "SELECT_VIN"], [401, "AUTH_ERROR"], [404, "VEHICLE_NOT_FOUND"], [503, "NO_DATA"], [500, "CONNECTION_ERROR"]]) {
            h.window.fetch = async () => ({ ok: false, status, json: () => { throw Error("should not parse error bodies"); } });
            await h.instance.fetchData();
            assert.equal(h.instance.error, key);
            assert.equal(h.instance.vehicleData, baseData);
        }
        for (const payload of [null, [], { error: "private server detail" }, { last_update: "invalid" }, { last_update: "0001-01-01T00:00:00Z" }]) {
            h.window.fetch = async () => ({ ok: true, json: async () => payload });
            await h.instance.fetchData();
            assert.equal(h.instance.error, "INVALID_DATA");
        }
        h.window.fetch = async () => ({ ok: true, json: async () => { throw Error("bad JSON"); } });
        await h.instance.fetchData();
        assert.equal(h.instance.error, "INVALID_DATA");
        h.window.fetch = async () => ({ ok: true, json: async () => baseData });
        await h.instance.fetchData();
        assert.equal(h.instance.error, null);
        assert.doesNotMatch(h.logs.join(" "), /private|synthetic-key|TEST/);
    } finally { h.close(); }
});

test("timeout retries and suspend/resume discard late responses without duplicate timers", async () => {
    const h = harness();
    try {
        h.window.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(Error("aborted")), { once: true });
        });
        const timeoutRequest = h.instance.fetchData();
        [...h.timers.values()][0].callback();
        await timeoutRequest;
        assert.equal(h.instance.error, "REQUEST_TIMEOUT");
        assert.equal(h.timers.size, 1);
        let finish;
        h.window.fetch = async () => {
            await new Promise(resolve => { finish = resolve; });
            return { ok: true, json: async () => baseData };
        };
        const late = h.instance.fetchData();
        h.instance.suspend();
        assert.equal(h.timers.size, 1); // in-flight request timeout, cleared in finally
        h.window.fetch = async () => ({ ok: true, json: async () => ({ ...baseData, mileage_km: 999 }) });
        h.instance.resume();
        await new Promise(resolve => setImmediate(resolve));
        finish();
        await late;
        assert.equal(h.instance.vehicleData.mileage_km, 999);
        assert.equal(h.timers.size, 1);
        h.instance.suspend();
        assert.equal(h.timers.size, 0);
    } finally { h.close(); }
});

test("locale formatting and complete translations are available in all eight languages", () => {
    const h = harness();
    try {
        const de = JSON.parse(readFileSync(join(root, "translations/de.json"), "utf8"));
        const dom = h.render(baseData, { locale: "de", translate: key => de[key] });
        assert.match(dom.textContent, /12.345 km/);
        for (const [language, path] of Object.entries(h.instance.getTranslations())) {
            const labels = JSON.parse(readFileSync(join(root, path), "utf8"));
            assert.deepEqual(Object.keys(labels).sort(), Object.keys(en).sort(), language);
            assert.ok(Object.values(labels).every(value => typeof value === "string" && value.length > 0), language);
        }
        assert.equal(Object.keys(h.instance.getTranslations())[0], "en");
    } finally { h.close(); }
});

const closedVehicle = {
    ...baseData, basic_data: { numberOfDoors: 2 }, doors_locked: "SECURED",
    door_front_left_open: false, door_front_right_open: false, trunk_open: false, hood_open: false,
    window_front_left_status: "CLOSED", window_front_right_status: "CLOSED",
};

test("three profiles show essentials, next service with ticker, or full data without touch", () => {
    const h = harness({ view: "minimal" });
    const vehicle = { ...closedVehicle, range_km: 500, fuel_level_pct: 70,
        service_messages: [{ title: "Engine oil", status: "OK" },
            { title: "Service - running in check (note additional work, if applicable)", status: "PENDING", unitOfLengthRemaining: "1500" }],
    };
    try {
        const minimal = h.render(vehicle);
        assert.ok(minimal.querySelector('[data-field="mileage"] .medium'));
        assert.equal(minimal.querySelector("table,.bmwcd-services,.bmwcd-metadata"), null);
        h.instance.config.view = "service";
        const service = h.render(vehicle);
        assert.match(service.querySelector(".bmwcd-service-name").textContent, /Running-in check/);
        assert.match(service.querySelector(".bmwcd-service-distance").textContent, /1,500/);
        assert.ok(service.querySelector(".bmwcd-ticker"));
        assert.equal(service.querySelectorAll('.bmwcd-ticker-group[aria-hidden="true"]').length, 1);
        assert.equal(service.querySelector("table,details,summary"), null);
        h.instance.config.view = "full";
        const full = h.render(vehicle);
        assert.ok(full.querySelector("table"));
        assert.ok(full.querySelector(".bmwcd-service-list"));
        assert.equal(full.querySelector("details,summary,.bmwcd-ticker"), null);
        assert.equal(h.instance.defaults.view, "minimal");
    } finally { h.close(); }
});

test("aggregate closure is green only with complete closed readings; openings are red", () => {
    const h = harness({ view: "minimal" });
    try {
        const status = data => h.render(data).querySelector('[data-field="security"]');
        assert.ok(status(closedVehicle).classList.contains("bmwcd-green"));
        assert.ok(status({ ...closedVehicle, hood_open: true }).classList.contains("bmwcd-red"));
        assert.ok(status({ ...closedVehicle, window_front_left_status: "TILTED" }).classList.contains("bmwcd-red"));
        assert.ok(status({ ...closedVehicle, window_front_left_status: undefined }).classList.contains("dimmed"));
        assert.ok(status({ ...closedVehicle, basic_data: { numberOfDoors: 4 } }).classList.contains("dimmed"));
        assert.ok(status({ ...closedVehicle, doors_locked: "UNLOCKED" }).classList.contains("bmwcd-red"));
        const rearWindows = { ...closedVehicle, window_rear_left_status: "CLOSED", window_rear_right_status: "CLOSED" };
        assert.ok(status(rearWindows).classList.contains("bmwcd-green"));
        h.instance.config.hiddenFields = ["security"];
        assert.equal(status(closedVehicle), null);
    } finally { h.close(); }
});

test("refreshes never fade and identical payloads do not restart the ticker", async () => {
    const h = harness({ view: "service", animationSpeed: 800 });
    try {
        h.window.fetch = async () => ({ ok: true, json: async () => ({ ...baseData }) });
        await h.instance.fetchData();
        assert.equal(h.instance.updates, 1);
        await h.instance.fetchData();
        assert.equal(h.instance.updates, 1);
        h.window.fetch = async () => ({ ok: true, json: async () => ({ ...baseData, mileage_km: 10 }) });
        await h.instance.fetchData();
        assert.equal(h.instance.updates, 2);
    } finally { h.close(); }
});

test("services prioritise overdue entries and translate standard BMW titles to German", () => {
    const h = harness({ view: "service" });
    try {
        const de = JSON.parse(readFileSync(join(root, "translations/de.json"), "utf8"));
        const dom = h.render({ ...baseData, service_messages: [
            { title: "Engine oil", status: "OK" }, { title: "Brake fluid", status: "OVERDUE" },
            { title: "Service - running in check (note additional work, if applicable)", status: "PENDING" },
        ] }, { locale: "de", translate: key => de[key] });
        assert.equal(dom.querySelector(".bmwcd-service-name").textContent, "Bremsflüssigkeit");
        assert.ok(dom.querySelector(".bmwcd-service-name").classList.contains("bmwcd-red"));
        assert.match(dom.querySelector(".bmwcd-ticker").textContent, /Einfahrkontrolle/);
        assert.doesNotMatch(dom.textContent, /Engine oil|running in check|note additional/);
    } finally { h.close(); }
});

test("ultra restores the original image-and-date header and four-row ICE table", () => {
    const h = harness({ view: "ultra", imageHeight: 100 });
    try {
        const node = h.render({ ...closedVehicle, range_fuel_km: 400, fuel_level_pct: 50,
            tire_pressure_fl_kpa: 230, service_messages: [{ title: "Test service" }] }, { imageSrc: "/test-car.png" });
        assert.ok(node.querySelector(".bmwcd-header > img"));
        assert.equal(node.querySelector("img").style.maxHeight, "100px");
        assert.match(node.querySelector("time").textContent, /2000/);
        assert.deepEqual([...node.querySelectorAll("tbody tr")].map(row => row.dataset.field), ["mileage", "range", "doors", "fuel"]);
        assert.equal(node.querySelector(".bmwcd-metrics,.bmwcd-security,.bmwcd-services,.bmwcd-details"), null);
        assert.equal(node.querySelector('[data-field="fuel"] .bmwcd-bar-bg'), null);
    } finally { h.close(); }
});

test("every profile adapts ICE, BEV and PHEV fields including zero values and separate ranges", () => {
    for (const view of ["ultra", "minimal", "service", "full"]) {
        const h = harness({ view });
        try {
            const ice = h.render({ ...closedVehicle, range_fuel_km: 410, fuel_level_pct: 52 });
            assert.match(ice.querySelector('[data-field="range"]').textContent, /410 km/);
            assert.ok(ice.querySelector('[data-field="fuel"]'));
            assert.equal(ice.querySelector('[data-field="battery"],[data-field="plug"],[data-field="range_fuel"]'), null);
            const bev = h.render({ ...closedVehicle, range_electric_km: 0, battery_soc_pct: 0,
                is_plugged_in: true, charging_status: "CHARGING", charging_time_remaining_min: 0 });
            assert.match(bev.querySelector('[data-field="range"]').textContent, /0 km/);
            assert.match(bev.querySelector('[data-field="battery"]').textContent, /0\s*%/);
            assert.match(bev.querySelector('[data-field="charging"]').textContent, /0 min left/);
            assert.ok(bev.querySelector('[data-field="plug"]'));
            assert.equal(bev.querySelector('[data-field="fuel"],[data-field="range_fuel"]'), null);
            const phev = h.render({ ...closedVehicle, range_km: 600, range_electric_km: 50,
                range_fuel_km: 550, battery_soc_pct: 20, fuel_level_pct: 25 });
            assert.match(phev.querySelector('[data-field="range_electric"]').textContent, /50 km/);
            assert.match(phev.querySelector('[data-field="range_fuel"]').textContent, /550 km/);
            assert.ok(phev.querySelector('[data-field="battery"]'));
            assert.ok(phev.querySelector('[data-field="fuel"]'));
        } finally { h.close(); }
    }
});
