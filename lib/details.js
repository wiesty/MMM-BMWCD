"use strict";
var BMWCD;
(function (BMWCD) {
    function element(tag, className = "", value) {
        const node = document.createElement(tag);
        node.className = className;
        if (value !== undefined)
            node.textContent = value;
        return node;
    }
    BMWCD.element = element;
    function disclosure(label) {
        const details = element("section", "bmwcd-details");
        details.appendChild(element("h3", "bmwcd-section-title xsmall dimmed regular", label));
        return details;
    }
    function appendVehicleDetails(wrapper, v, options, t) {
        if (options.hiddenFields.includes("vehicle_details"))
            return;
        const basic = BMWCD.record(v.basic_data);
        const fields = [
            ["modelName", "MODEL"], ["seriesDevt", "SERIES"], ["engine", "ENGINE_MODEL"],
            ["constructionDate", "PRODUCTION_DATE"], ["colourDescription", "COLOUR"], ["fullSAList", "EQUIPMENT"],
        ];
        const list = element("dl", "xsmall bmwcd-metadata");
        fields.forEach(([field, label]) => {
            const raw = basic[field];
            const value = Array.isArray(raw) ? raw.filter(item => typeof item === "string").join(", ") : BMWCD.text(basic, field);
            if (!value)
                return;
            list.appendChild(element("dt", "dimmed", t(label)));
            list.appendChild(element("dd", "bright", value));
        });
        if (!list.childElementCount)
            return;
        const details = disclosure(t("VEHICLE_DETAILS"));
        details.appendChild(list);
        wrapper.appendChild(details);
    }
    BMWCD.appendVehicleDetails = appendVehicleDetails;
    function appendTelematics(wrapper, v, view) {
        if (!view.options.showTelematics)
            return;
        const entries = Object.entries(BMWCD.record(v.telematic_data)).filter(([, raw]) => BMWCD.text(BMWCD.record(raw), "value") !== null);
        if (!entries.length)
            return;
        const details = disclosure(`${view.translate("TELEMATICS")} (${entries.length})`);
        const list = element("dl", "xsmall bmwcd-telematics");
        entries.sort(([a], [b]) => a.localeCompare(b)).forEach(([key, raw]) => {
            const entry = BMWCD.record(raw);
            list.appendChild(element("dt", "dimmed", key));
            const value = `${BMWCD.text(entry, "value")}${BMWCD.text(entry, "unit") ? ` ${BMWCD.text(entry, "unit")}` : ""}`;
            const description = element("dd", "bright", value);
            description.appendChild(element("div", "dimmed", BMWCD.date(entry.timestamp, view.locale)));
            list.appendChild(description);
        });
        details.appendChild(list);
        wrapper.appendChild(details);
    }
    BMWCD.appendTelematics = appendTelematics;
})(BMWCD || (BMWCD = {}));
