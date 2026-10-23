namespace BMWCD {
    function renderRow(row: Row): HTMLTableRowElement {
        const tr = element("tr");
        tr.dataset.field = row.key;
        if (row.title) tr.title = row.title;
        const heading = element("th", "dimmed");
        heading.scope = "row";
        const icon = element("i", `fas fa-${row.icon}`);
        icon.setAttribute("aria-hidden", "true");
        heading.append(icon, document.createTextNode(` ${row.label}`));
        const value = element("td", "bmwcd-val");
        if (row.value) value.appendChild(element("span", row.tone || "bright", row.value));
        if (row.lines?.length) {
            const lines = element("div", "bmwcd-grid");
            row.lines.forEach(line => {
                const cell = element("span", "bmwcd-grid-cell");
                cell.append(element("span", "dimmed xsmall", `${line.label} `),
                    element("span", line.tone || "bright", line.value));
                lines.appendChild(cell);
            });
            value.appendChild(lines);
        }
        if (row.percent !== undefined && row.key !== "fuel") {
            const bar = element("span", "bmwcd-bar-bg");
            bar.setAttribute("aria-hidden", "true");
            const fill = element("span", `bmwcd-bar-fill ${row.tone || ""}`);
            fill.style.width = `${row.percent}%`;
            bar.appendChild(fill);
            value.appendChild(bar);
        }
        tr.append(heading, value);
        return tr;
    }

    function notice(wrapper: HTMLElement, message: string): void {
        const node = element("div", "bmwcd-notice xsmall", message);
        node.setAttribute("role", "status");
        wrapper.appendChild(node);
    }

    function appendTable(wrapper: HTMLElement, rows: Row[], name: string): void {
        if (!rows.length) return;
        const table = element("table", "bmwcd-table small");
        table.setAttribute("aria-label", name);
        const body = element("tbody");
        rows.forEach(row => body.appendChild(renderRow(row)));
        table.appendChild(body);
        wrapper.appendChild(table);
    }

    // As in the original module, optional BMW fields determine which drive data is shown.
    function energyRows(rows: Row[], data: Data): Row[] {
        return rows.filter(row => ["range_electric", "range_fuel", "plug"].includes(row.key)
            || (row.key === "charging" && text(data, "charging_status")?.toUpperCase() === "CHARGING"));
    }

    export function render(view: View): HTMLElement {
        const { data: v, options, translate: t, locale } = view;
        const mode = ["ultra", "minimal", "service", "full"].includes(options.view) ? options.view : "minimal";
        const wrapper = element("div", `bmwcd-wrapper small bmwcd-view-${mode}`);
        if (!v) {
            notice(wrapper, t(view.error || "LOADING"));
            return wrapper;
        }
        const header = element("div", "bmwcd-header");
        const name = options.vehicleName || text(record(v.basic_data), "modelName") || "My BMW";
        if (view.imageSrc) {
            const image = element("img", "bmwcd-img");
            image.src = view.imageSrc;
            image.alt = name;
            if (Number.isFinite(options.imageHeight) && options.imageHeight > 0) {
                image.style.maxHeight = `${options.imageHeight}px`;
            }
            image.onerror = () => image.remove();
            (mode === "ultra" ? header : wrapper).appendChild(image);
        }
        const heading = element("div", "bmwcd-header-text");
        heading.appendChild(element("h2", "small bold bright bmwcd-title", name));
        const reading = readingTime(v);
        const time = timestamp(reading || v.last_update);
        const updated = element("time", "bmwcd-updated xsmall dimmed", mode === "ultra" ? date(reading || v.last_update, locale) : time === null ? "—" : new Date(time).toLocaleTimeString(locale, {
            hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }));
        if (time !== null) updated.dateTime = new Date(time).toISOString();
        updated.title = `${t(reading ? "VEHICLE_READING" : "LAST_POLL")}: ${date(reading || v.last_update, locale)}\n${t("LAST_POLL")}: ${date(v.last_update, locale)}`;
        heading.appendChild(updated);
        header.appendChild(heading);
        wrapper.appendChild(header);

        if (view.error) notice(wrapper, `${t(view.error)} · ${t("SHOWING_CACHED")}`);
        const rows = vehicleRows(v, options, locale, t);
        if (mode === "ultra") {
            const essentials = new Set(["mileage", "range", "doors", "battery", "fuel",
                ...energyRows(rows, v).map(row => row.key)]);
            appendTable(wrapper, rows.filter(row => essentials.has(row.key)), name);
        } else {
            appendMetrics(wrapper, rows);
            appendSecurity(wrapper, v, options, t);
            appendTable(wrapper, mode === "full" ? rows.filter(row => !isMetric(row)) : energyRows(rows, v), name);
        }
        appendServices(wrapper, v, { ...options, view: mode }, t, locale);
        if (mode === "full") {
            appendVehicleDetails(wrapper, v, options, t);
            appendTelematics(wrapper, v, view);
        }
        return wrapper;
    }
}
