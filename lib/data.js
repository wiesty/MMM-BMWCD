"use strict";
var BMWCD;
(function (BMWCD) {
    function record(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    BMWCD.record = record;
    function numeric(data, key) {
        const value = data[key];
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    }
    BMWCD.numeric = numeric;
    function text(data, key) {
        const value = data[key];
        return typeof value === "string" && value.trim() && value !== "null" ? value : null;
    }
    BMWCD.text = text;
    function bool(data, key) {
        return typeof data[key] === "boolean" ? data[key] : null;
    }
    BMWCD.bool = bool;
    function number(value, locale, digits = 1) {
        return value.toLocaleString(locale, { maximumFractionDigits: digits });
    }
    BMWCD.number = number;
    function date(value, locale) {
        const time = timestamp(value);
        return time === null ? "—" : new Date(time).toLocaleString(locale, {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
    }
    BMWCD.date = date;
    function timestamp(value) {
        if (typeof value !== "string" || !value || value.startsWith("0001-"))
            return null;
        const result = Date.parse(value);
        return Number.isFinite(result) ? result : null;
    }
    BMWCD.timestamp = timestamp;
    // BMW readings can be older than the gateway's last successful poll.
    function readingTime(data) {
        let newest = null;
        let newestTime = -Infinity;
        for (const entry of Object.values(record(data.telematic_data))) {
            const source = record(entry);
            const time = timestamp(source.timestamp);
            if (time !== null && time > newestTime && text(source, "value") !== null) {
                newestTime = time;
                newest = source.timestamp;
            }
        }
        return newest;
    }
    BMWCD.readingTime = readingTime;
    function isStale(data, limit, now = Date.now()) {
        if (!data || limit <= 0)
            return false;
        const time = timestamp(readingTime(data) || data.last_update);
        return time !== null && now - time > limit;
    }
    BMWCD.isStale = isStale;
    function state(value, t) {
        if (!value)
            return t("UNKNOWN");
        const states = {
            SECURED: "LOCKED", LOCKED: "LOCKED", SELECTIVELOCKED: "PARTIALLY_LOCKED",
            UNLOCKED: "UNLOCKED", OPEN: "OPEN", OPENED: "OPEN", CLOSED: "CLOSED",
            ARMED: "ARMED", DISARMED: "DISARMED", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE",
            ON: "ACTIVE", OFF: "INACTIVE", CHARGING: "CHARGING_ACTIVE",
            NOT_CHARGING: "NOT_CHARGING", NOTCHARGING: "NOT_CHARGING",
            FINISHED: "CHARGING_COMPLETE", FULLY_CHARGED: "CHARGING_COMPLETE",
            COMPLETED: "CHARGING_COMPLETE", CHARGINGCOMPLETED: "CHARGING_COMPLETE",
            INVALID: "UNKNOWN", UNKNOWN: "UNKNOWN", ASN_ISUNKNOWN: "UNKNOWN",
            OK: "STATUS_OK", PENDING: "STATUS_PENDING", OVERDUE: "STATUS_OVERDUE",
            DOORSTILTCABIN: "ALARM_SENSORS",
        };
        return states[value.toUpperCase()] ? t(states[value.toUpperCase()]) : value;
    }
    BMWCD.state = state;
    function isVehicle(value) {
        const data = record(value);
        return !data.error && timestamp(data.last_update) !== null;
    }
    BMWCD.isVehicle = isVehicle;
    function imageSource(path, file) {
        if (!path)
            return null;
        if (/^https?:\/\//i.test(path) || path.startsWith("/"))
            return path;
        if (/^[a-z][a-z\d+.-]*:/i.test(path))
            return null;
        return file(path);
    }
    BMWCD.imageSource = imageSource;
})(BMWCD || (BMWCD = {}));
