const assert = require("node:assert/strict");
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

module.exports = { harness, baseData, en, root };
