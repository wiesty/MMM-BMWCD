namespace BMWCD {
    export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", value?: string): HTMLElementTagNameMap[K] {
        const node = document.createElement(tag);
        node.className = className;
        if (value !== undefined) node.textContent = value;
        return node;
    }

    function disclosure(label: string): HTMLElement {
        const details = element("section", "bmwcd-details");
        details.appendChild(element("h3", "bmwcd-section-title xsmall dimmed regular", label));
        return details;
    }

    export function appendVehicleDetails(wrapper: HTMLElement, v: Data, options: Options, t: Translate): void {
        if (options.hiddenFields.includes("vehicle_details")) return;
        const basic = record(v.basic_data);
        const fields = [
            ["modelName", "MODEL"], ["seriesDevt", "SERIES"], ["engine", "ENGINE_MODEL"],
            ["constructionDate", "PRODUCTION_DATE"], ["colourDescription", "COLOUR"], ["fullSAList", "EQUIPMENT"],
        ];
        const list = element("dl", "xsmall bmwcd-metadata");
        fields.forEach(([field, label]) => {
            const raw = basic[field];
            const value = Array.isArray(raw) ? raw.filter(item => typeof item === "string").join(", ") : text(basic, field);
            if (!value) return;
            list.appendChild(element("dt", "dimmed", t(label)));
            list.appendChild(element("dd", "bright", value));
        });
        if (!list.childElementCount) return;
        const details = disclosure(t("VEHICLE_DETAILS"));
        details.appendChild(list);
        wrapper.appendChild(details);
    }

    export function appendTelematics(wrapper: HTMLElement, v: Data, view: View): void {
        if (!view.options.showTelematics) return;
        const entries = Object.entries(record(v.telematic_data)).filter(([, raw]) => text(record(raw), "value") !== null);
        if (!entries.length) return;
        const details = disclosure(`${view.translate("TELEMATICS")} (${entries.length})`);
        const list = element("dl", "xsmall bmwcd-telematics");
        entries.sort(([a], [b]) => a.localeCompare(b)).forEach(([key, raw]) => {
            const entry = record(raw);
            list.appendChild(element("dt", "dimmed", key));
            const value = `${text(entry, "value")}${text(entry, "unit") ? ` ${text(entry, "unit")}` : ""}`;
            const description = element("dd", "bright", value);
            description.appendChild(element("div", "dimmed", date(entry.timestamp, view.locale)));
            list.appendChild(description);
        });
        details.appendChild(list);
        wrapper.appendChild(details);
    }
}
