"use strict";
var BMWCD;
(function (BMWCD) {
    function renderRow(row) {
        const tr = BMWCD.element("tr");
        tr.dataset.field = row.key;
        if (row.title)
            tr.title = row.title;
        const heading = BMWCD.element("th", "dimmed");
        heading.scope = "row";
        const icon = BMWCD.element("i", `fas fa-${row.icon}`);
        icon.setAttribute("aria-hidden", "true");
        heading.append(icon, document.createTextNode(` ${row.label}`));
        const value = BMWCD.element("td", "bmwcd-val");
        if (row.value)
            value.appendChild(BMWCD.element("span", row.tone || "bright", row.value));
        if (row.lines?.length) {
            const lines = BMWCD.element("div", "bmwcd-grid");
            row.lines.forEach(line => {
                const cell = BMWCD.element("span", "bmwcd-grid-cell");
                cell.append(BMWCD.element("span", "dimmed xsmall", `${line.label} `), BMWCD.element("span", line.tone || "bright", line.value));
                lines.appendChild(cell);
            });
            value.appendChild(lines);
        }
        if (row.percent !== undefined && row.key !== "fuel") {
            const bar = BMWCD.element("span", "bmwcd-bar-bg");
            bar.setAttribute("aria-hidden", "true");
            const fill = BMWCD.element("span", `bmwcd-bar-fill ${row.tone || ""}`);
            fill.style.width = `${row.percent}%`;
            bar.appendChild(fill);
            value.appendChild(bar);
        }
        tr.append(heading, value);
        return tr;
    }
    function notice(wrapper, message) {
        const node = BMWCD.element("div", "bmwcd-notice xsmall", message);
        node.setAttribute("role", "status");
        wrapper.appendChild(node);
    }
    function appendTable(wrapper, rows, name) {
        if (!rows.length)
            return;
        const table = BMWCD.element("table", "bmwcd-table small");
        table.setAttribute("aria-label", name);
        const body = BMWCD.element("tbody");
        rows.forEach(row => body.appendChild(renderRow(row)));
        table.appendChild(body);
        wrapper.appendChild(table);
    }
    // As in the original module, optional BMW fields determine which drive data is shown.
    function energyRows(rows, data) {
        return rows.filter(row => ["range_electric", "range_fuel", "plug"].includes(row.key)
            || (row.key === "charging" && BMWCD.text(data, "charging_status")?.toUpperCase() === "CHARGING"));
    }
    function render(view) {
        const { data: v, options, translate: t, locale } = view;
        const mode = ["ultra", "minimal", "service", "full"].includes(options.view) ? options.view : "minimal";
        const wrapper = BMWCD.element("div", `bmwcd-wrapper small bmwcd-view-${mode}`);
        if (!v) {
            notice(wrapper, t(view.error || "LOADING"));
            return wrapper;
        }
        const header = BMWCD.element("div", "bmwcd-header");
        const name = options.vehicleName || BMWCD.text(BMWCD.record(v.basic_data), "modelName") || "My BMW";
        if (view.imageSrc) {
            const image = BMWCD.element("img", "bmwcd-img");
            image.src = view.imageSrc;
            image.alt = name;
            if (Number.isFinite(options.imageHeight) && options.imageHeight > 0) {
                image.style.maxHeight = `${options.imageHeight}px`;
            }
            image.onerror = () => image.remove();
            (mode === "ultra" ? header : wrapper).appendChild(image);
        }
        const heading = BMWCD.element("div", "bmwcd-header-text");
        heading.appendChild(BMWCD.element("h2", "small bold bright bmwcd-title", name));
        const reading = BMWCD.readingTime(v);
        const time = BMWCD.timestamp(reading || v.last_update);
        const updated = BMWCD.element("time", "bmwcd-updated xsmall dimmed", mode === "ultra" ? BMWCD.date(reading || v.last_update, locale) : time === null ? "—" : new Date(time).toLocaleTimeString(locale, {
            hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }));
        if (time !== null)
            updated.dateTime = new Date(time).toISOString();
        updated.title = `${t(reading ? "VEHICLE_READING" : "LAST_POLL")}: ${BMWCD.date(reading || v.last_update, locale)}\n${t("LAST_POLL")}: ${BMWCD.date(v.last_update, locale)}`;
        heading.appendChild(updated);
        header.appendChild(heading);
        wrapper.appendChild(header);
        if (view.error)
            notice(wrapper, `${t(view.error)} · ${t("SHOWING_CACHED")}`);
        const rows = BMWCD.vehicleRows(v, options, locale, t);
        if (mode === "ultra") {
            const essentials = new Set(["mileage", "range", "doors", "battery", "fuel",
                ...energyRows(rows, v).map(row => row.key)]);
            appendTable(wrapper, rows.filter(row => essentials.has(row.key)), name);
        }
        else {
            BMWCD.appendMetrics(wrapper, rows);
            BMWCD.appendSecurity(wrapper, v, options, t);
            appendTable(wrapper, mode === "full" ? rows.filter(row => !BMWCD.isMetric(row)) : energyRows(rows, v), name);
        }
        BMWCD.appendServices(wrapper, v, { ...options, view: mode }, t, locale);
        if (mode === "full") {
            BMWCD.appendVehicleDetails(wrapper, v, options, t);
            BMWCD.appendTelematics(wrapper, v, view);
        }
        return wrapper;
    }
    BMWCD.render = render;
})(BMWCD || (BMWCD = {}));
