"use strict";
var BMWCD;
(function (BMWCD) {
    function vehicleRows(v, options, locale, t) {
        const rows = [];
        const visible = (key) => !options.hiddenFields.includes(key);
        const add = (key, label, icon, value, tone = "bright") => {
            if (visible(key) && value !== null)
                rows.push({ key, label: t(label), icon, value, tone });
        };
        const measure = (key, unit, digits = 1) => {
            const value = BMWCD.numeric(v, key);
            return value === null ? null : `${BMWCD.number(value, locale, digits)} ${unit}`;
        };
        const booleanRow = (key, field, label, icon, yes = "ACTIVE", no = "INACTIVE", warn = false) => {
            const value = BMWCD.bool(v, field);
            if (value !== null)
                add(key, label, icon, t(value ? yes : no), warn ? value ? "bmwcd-red" : "bmwcd-green" : "bright");
        };
        add("mileage", "MILEAGE", "gauge-high", measure("mileage_km", "km", 0));
        const mainRange = BMWCD.numeric(v, "range_km") ?? BMWCD.numeric(v, "range_electric_km") ?? BMWCD.numeric(v, "range_fuel_km");
        add("range", "RANGE", "road", mainRange === null ? null : `${BMWCD.number(mainRange, locale)} km`);
        for (const [key, field, label, icon] of [
            ["range_electric", "range_electric_km", "RANGE_ELECTRIC", "bolt"],
            ["range_fuel", "range_fuel_km", "RANGE_FUEL", "gas-pump"],
        ]) {
            const value = BMWCD.numeric(v, field);
            if (value !== mainRange)
                add(key, label, icon, measure(field, "km"));
        }
        const lock = BMWCD.text(v, "doors_locked");
        const secured = lock !== null && ["SECURED", "LOCKED"].includes(lock.toUpperCase());
        const unlocked = lock !== null && ["UNLOCKED", "SELECTIVELOCKED"].includes(lock.toUpperCase());
        add("doors", "DOORS", secured ? "lock" : "lock-open", BMWCD.state(lock, t), secured ? "bmwcd-green" : unlocked ? "bmwcd-red" : "dimmed");
        for (const [key, field, label, icon] of [
            ["battery", "battery_soc_pct", "BATTERY", "bolt"],
            ["fuel", "fuel_level_pct", "FUEL", "gas-pump"],
        ]) {
            const value = BMWCD.numeric(v, field);
            if (value !== null && visible(key)) {
                rows.push({ key, label: t(label), icon, value: `${BMWCD.number(value, locale)}%`,
                    percent: Math.min(100, Math.max(0, value)),
                    tone: value <= 10 ? "bmwcd-red" : value <= 25 ? "dimmed" : "bright" });
            }
        }
        add("fuel_liters", "FUEL_LITERS", "gas-pump", measure("fuel_level_liters", "l"));
        add("battery_target", "BATTERY_TARGET", "bullseye", measure("battery_soc_target_pct", "%"));
        booleanRow("plug", "is_plugged_in", "PLUG", "plug", "CONNECTED", "DISCONNECTED");
        const charging = BMWCD.text(v, "charging_status");
        if (charging) {
            const remaining = BMWCD.numeric(v, "charging_time_remaining_min");
            const value = charging.toUpperCase() === "CHARGING" && remaining !== null
                ? t("CHARGING_REMAINING").replace("{minutes}", BMWCD.number(Math.round(remaining), locale, 0))
                : BMWCD.state(charging, t);
            add("charging", "CHARGING", "charging-station", value);
        }
        add("charging_power", "CHARGING_POWER", "bolt", measure("charging_power_kw", "kW"));
        const positions = ["fl", "fr", "rl", "rr"];
        const positionLabels = ["FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"];
        const openings = [];
        ["front_left", "front_right", "rear_left", "rear_right"].forEach((field, index) => {
            const open = BMWCD.bool(v, `door_${field}_open`);
            if (open !== null)
                openings.push({ label: t(positionLabels[index]), value: t(open ? "OPEN" : "CLOSED"),
                    tone: open ? "bmwcd-red" : "bmwcd-green" });
        });
        const doorsStatus = BMWCD.text(v, "doors_status");
        if (visible("openings") && (openings.length || doorsStatus)) {
            rows.push({ key: "openings", label: t("DOOR_STATUS"), icon: "door-open",
                value: doorsStatus ? BMWCD.state(doorsStatus, t) : "", lines: openings });
        }
        booleanRow("trunk", "trunk_open", "TRUNK", "car-rear", "OPEN", "CLOSED", true);
        booleanRow("hood", "hood_open", "HOOD", "car", "OPEN", "CLOSED", true);
        const windows = [];
        ["front_left", "front_right", "rear_left", "rear_right"].forEach((position, index) => {
            const value = BMWCD.text(v, `window_${position}_status`);
            if (value)
                windows.push({ label: t(positionLabels[index]), value: BMWCD.state(value, t),
                    tone: value.toUpperCase() === "CLOSED" ? "bmwcd-green" : ["OPEN", "OPENED", "PARTIALLY_OPEN", "TILTED"].includes(value.toUpperCase()) ? "bmwcd-red" : "dimmed" });
        });
        if (visible("windows") && windows.length) {
            rows.push({ key: "windows", label: t("WINDOWS"), icon: "car-side", value: "", lines: windows });
        }
        const armed = BMWCD.text(v, "alarm_armed_status");
        if (armed)
            add("alarm", "ALARM", "shield-halved", BMWCD.state(armed, t));
        booleanRow("alarm", "alarm_active", "ALARM_ACTIVE", "bell", "ACTIVE", "INACTIVE", true);
        const climate = BMWCD.text(v, "preconditioning_status");
        if (climate) {
            const remaining = measure("preconditioning_remaining_min", "min");
            add("climate", "CLIMATE", "fan", `${BMWCD.state(climate, t)}${remaining ? ` · ${remaining}` : ""}`);
        }
        if (visible("tires") && positions.some(position => BMWCD.numeric(v, `tire_pressure_${position}_kpa`) !== null
            || (options.showTireTargets && BMWCD.numeric(v, `tire_pressure_target_${position}_kpa`) !== null))) {
            const pressure = (value) => value === null ? "—" : BMWCD.number(value / 100, locale, 1);
            const hasTargets = options.showTireTargets && positions.some(position => BMWCD.numeric(v, `tire_pressure_target_${position}_kpa`) !== null);
            rows.push({ key: "tires", label: t("TIRES"), icon: "circle-dot", value: "",
                title: hasTargets ? t("TIRE_ACTUAL_TARGET") : "bar",
                lines: positions.map((position, index) => {
                    const current = BMWCD.numeric(v, `tire_pressure_${position}_kpa`);
                    const target = BMWCD.numeric(v, `tire_pressure_target_${position}_kpa`);
                    return { label: t(positionLabels[index]),
                        value: `${pressure(current)}${hasTargets ? ` / ${pressure(target)}` : ""} bar` };
                }),
            });
        }
        const diagnosis = BMWCD.text(v, "tire_diagnosis");
        if (diagnosis)
            add("tire_diagnosis", "TIRE_DIAGNOSIS", "circle-exclamation", BMWCD.state(diagnosis, t));
        add("battery_voltage", "BATTERY_VOLTAGE", "car-battery", measure("battery_voltage_v", "V"));
        const coolant = BMWCD.numeric(v, "coolant_temperature");
        if (coolant !== null) {
            const entry = BMWCD.record(BMWCD.record(v.telematic_data)["vehicle.drivetrain.internalCombustionEngine.engine.ect"]);
            add("coolant", "COOLANT", "temperature-half", `${BMWCD.number(coolant, locale)}${BMWCD.text(entry, "unit") ? ` ${BMWCD.text(entry, "unit")}` : ""}`);
        }
        booleanRow("moving", "is_moving", "MOVING", "car-side", "YES", "NO");
        booleanRow("ignition", "is_ignition_on", "IGNITION", "key");
        booleanRow("engine", "is_engine_on", "ENGINE", "gears");
        booleanRow("lights", "lights_on", "LIGHTS", "lightbulb");
        add("service", "SERVICE_DISTANCE", "wrench", measure("service_distance_km", "km", 0));
        add("check_control", "CHECK_CONTROL", "triangle-exclamation", BMWCD.text(v, "check_control_messages"));
        const latitude = BMWCD.numeric(v, "latitude");
        const longitude = BMWCD.numeric(v, "longitude");
        if (options.showLocation && latitude !== null && longitude !== null) {
            add("location", "LOCATION", "location-dot", `${BMWCD.number(latitude, locale, 5)}, ${BMWCD.number(longitude, locale, 5)}`);
            add("location", "ALTITUDE", "mountain", measure("altitude_m", "m", 0));
            add("location", "HEADING", "compass", measure("heading_deg", "°", 0));
        }
        return rows;
    }
    BMWCD.vehicleRows = vehicleRows;
})(BMWCD || (BMWCD = {}));
