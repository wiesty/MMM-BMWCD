namespace BMWCD {
    export function record(value: unknown): Data {
        return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
    }

    export function numeric(data: Data, key: string): number | null {
        const value = data[key];
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    }

    export function text(data: Data, key: string): string | null {
        const value = data[key];
        return typeof value === "string" && value.trim() && value !== "null" ? value : null;
    }

    export function bool(data: Data, key: string): boolean | null {
        return typeof data[key] === "boolean" ? data[key] as boolean : null;
    }

    export function number(value: number, locale: string, digits = 1): string {
        return value.toLocaleString(locale, { maximumFractionDigits: digits });
    }

    export function date(value: unknown, locale: string): string {
        const time = timestamp(value);
        return time === null ? "—" : new Date(time).toLocaleString(locale, {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
    }

    export function timestamp(value: unknown): number | null {
        if (typeof value !== "string" || !value || value.startsWith("0001-")) return null;
        const result = Date.parse(value);
        return Number.isFinite(result) ? result : null;
    }

    // BMW readings can be older than the gateway's last successful poll.
    export function readingTime(data: Data): string | null {
        let newest: string | null = null;
        let newestTime = -Infinity;
        for (const entry of Object.values(record(data.telematic_data))) {
            const source = record(entry);
            const time = timestamp(source.timestamp);
            if (time !== null && time > newestTime && text(source, "value") !== null) {
                newestTime = time;
                newest = source.timestamp as string;
            }
        }
        return newest;
    }

    export function isStale(data: Data | null, limit: number, now = Date.now()): boolean {
        if (!data || limit <= 0) return false;
        const time = timestamp(readingTime(data) || data.last_update);
        return time !== null && now - time > limit;
    }

    export function state(value: string | null, t: Translate): string {
        if (!value) return t("UNKNOWN");
        const states: Record<string, string> = {
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

    export function isVehicle(value: unknown): value is Data {
        const data = record(value);
        return !data.error && timestamp(data.last_update) !== null;
    }

    export function imageSource(path: string | null, file: (path: string) => string): string | null {
        if (!path) return null;
        if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
        if (/^[a-z][a-z\d+.-]*:/i.test(path)) return null;
        return file(path);
    }
}
