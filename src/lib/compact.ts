namespace BMWCD {
    const metricKeys = ["mileage", "range", "battery", "fuel"];

    export function isMetric(row: Row): boolean {
        return metricKeys.includes(row.key);
    }

    export function appendMetrics(wrapper: HTMLElement, rows: Row[]): void {
        const metrics = element("dl", "bmwcd-metrics");
        rows.filter(isMetric).forEach(row => {
            const item = element("div", "bmwcd-metric");
            item.dataset.field = row.key;
            item.appendChild(element("dt", "bmwcd-metric-label xsmall dimmed", row.label));
            const value = element("dd", row.tone || "bright");
            const unit = /\s?(km|%)$/.exec(row.value);
            const digits = unit ? row.value.slice(0, unit.index) : row.value;
            if (digits.length >= 6) item.classList.add("bmwcd-metric-long");
            value.appendChild(element("span", "bmwcd-metric-number medium", digits));
            if (unit) value.appendChild(element("span", "bmwcd-metric-unit small", ` ${unit[1]}`));
            item.appendChild(value);
            if (row.percent !== undefined && row.key !== "fuel") {
                const bar = element("span", "bmwcd-bar-bg");
                bar.setAttribute("aria-hidden", "true");
                const fill = element("span", `bmwcd-bar-fill ${row.tone || ""}`);
                fill.style.width = `${row.percent}%`;
                bar.appendChild(fill);
                item.appendChild(bar);
            }
            metrics.appendChild(item);
        });
        if (metrics.childElementCount > 3 || metrics.querySelector(".bmwcd-metric-long")) metrics.classList.add("bmwcd-metrics-two");
        if (metrics.childElementCount) wrapper.appendChild(metrics);
    }

    export function security(v: Data, t: Translate): { value: string; tone: Tone; icon: string } {
        const open: string[] = [];
        let incomplete = false;
        const basic = record(v.basic_data);
        const doorCount = numeric(basic, "numberOfDoors") ?? Number(text(basic, "numberOfDoors"));
        const rearDoors = doorCount >= 4 || ["door_rear_left_open", "door_rear_right_open"].some(key => v[key] !== undefined);
        const rearWindows = doorCount >= 4 || ["window_rear_left_status", "window_rear_right_status"].some(key => v[key] !== undefined);
        const overallDoorsClosed = text(v, "doors_status")?.toUpperCase() === "CLOSED";
        if (![2, 4, 5].includes(doorCount) && !rearDoors && !overallDoorsClosed) incomplete = true;
        const positions = ["front_left", "front_right", "rear_left", "rear_right"];
        const labels = ["FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"];
        const check = (key: string, label: string, fallback = false) => {
            const value = bool(v, key);
            if (value === true) open.push(label);
            else if (value === null && !fallback) incomplete = true;
        };
        positions.forEach((position, index) => {
            if (index < 2 || rearDoors) check(`door_${position}_open`, `${t("DOORS")} ${t(labels[index])}`, overallDoorsClosed);
            if (index >= 2 && !rearWindows) return;
            const window = text(v, `window_${position}_status`)?.toUpperCase();
            if (["OPEN", "OPENED", "PARTIALLY_OPEN", "TILTED"].includes(window || "")) {
                open.push(`${t("WINDOWS")} ${t(labels[index])}`);
            } else if (window !== "CLOSED") incomplete = true;
        });
        check("trunk_open", t("TRUNK"));
        check("hood_open", t("HOOD"));
        const lock = text(v, "doors_locked")?.toUpperCase() || null;
        const locked = lock === "LOCKED" || lock === "SECURED";
        const unlocked = lock === "UNLOCKED" || lock === "SELECTIVELOCKED";
        const closure = open.length ? `${t("OPEN")}: ${open.join(", ")}` : t(incomplete ? "CLOSURE_UNKNOWN" : "ALL_CLOSED");
        return {
            value: `${closure} · ${state(lock, t)}`,
            tone: open.length || unlocked ? "bmwcd-red" : incomplete || !locked ? "dimmed" : "bmwcd-green",
            icon: open.length || unlocked ? "lock-open" : locked ? "lock" : "shield-halved",
        };
    }

    export function appendSecurity(wrapper: HTMLElement, v: Data, options: Options, t: Translate): void {
        if (options.hiddenFields.includes("security")) return;
        const status = security(v, t);
        const node = element("div", `bmwcd-security small ${status.tone}`);
        node.dataset.field = "security";
        const icon = element("i", `fas fa-${status.icon}`);
        icon.setAttribute("aria-hidden", "true");
        node.append(icon, element("span", "", status.value));
        wrapper.appendChild(node);
    }
}
