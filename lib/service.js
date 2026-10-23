"use strict";
var BMWCD;
(function (BMWCD) {
    function serviceTitle(message, t) {
        const title = (BMWCD.text(message, "title") || "").replace(/\s*\([^)]*\)/g, "").replace(/^Service\s*-\s*/i, "").trim();
        const names = {
            "running in check": "SERVICE_RUNNING_IN", "running-in check": "SERVICE_RUNNING_IN",
            "engine oil": "SERVICE_OIL", "vehicle check": "SERVICE_VEHICLE",
            "brake fluid": "SERVICE_BRAKE_FLUID", "statutory vehicle inspection": "SERVICE_INSPECTION",
        };
        return names[title.toLowerCase()] ? t(names[title.toLowerCase()]) : title;
    }
    function distance(message, locale) {
        const value = BMWCD.text(message, "unitOfLengthRemaining");
        if (!value || value === "-")
            return null;
        return /^-?\d+(\.\d+)?$/.test(value) ? BMWCD.number(Number(value), locale, 0) : value;
    }
    function serviceInfo(message, t, locale) {
        const status = BMWCD.text(message, "status");
        const parts = status ? [BMWCD.state(status, t)] : [];
        const remaining = distance(message, locale);
        if (remaining)
            parts.push(`${remaining} (${t("VEHICLE_UNIT")})`);
        const due = BMWCD.text(message, "date");
        if (due && due !== "-")
            parts.push(`${t("SERVICE_DUE")}: ${due}`);
        return parts.join(" · ");
    }
    function serviceMessages(v) {
        const messages = Array.isArray(v.service_messages)
            ? v.service_messages.map(BMWCD.record).filter(message => BMWCD.text(message, "title")) : [];
        const priority = (message) => {
            const status = BMWCD.text(message, "status")?.toUpperCase();
            return status === "OVERDUE" ? 0 : status === "PENDING" || status === "DUE" ? 1 : status === "OK" ? 3 : 2;
        };
        return messages.sort((a, b) => priority(a) - priority(b));
    }
    BMWCD.serviceMessages = serviceMessages;
    function appendTicker(section, messages, options, t, locale) {
        if (!messages.length)
            return;
        const ticker = BMWCD.element("div", "bmwcd-ticker");
        ticker.tabIndex = 0;
        ticker.setAttribute("aria-label", t("OTHER_SERVICES"));
        const track = BMWCD.element("div", "bmwcd-ticker-track");
        const duration = Number.isFinite(options.serviceScrollDuration) && options.serviceScrollDuration > 0
            ? options.serviceScrollDuration : 90;
        track.style.setProperty("--bmwcd-scroll-duration", `${duration}s`);
        const group = BMWCD.element("div", "bmwcd-ticker-group");
        messages.forEach(message => {
            const item = BMWCD.element("span", "bmwcd-ticker-item");
            const tone = BMWCD.text(message, "status")?.toUpperCase() === "OVERDUE" ? "bmwcd-red" : "bright";
            item.append(BMWCD.element("span", tone, serviceTitle(message, t)), BMWCD.element("span", "bmwcd-service-meta xsmall dimmed", serviceInfo(message, t, locale)));
            group.appendChild(item);
        });
        const duplicate = group.cloneNode(true);
        duplicate.setAttribute("aria-hidden", "true");
        track.append(group, duplicate);
        ticker.appendChild(track);
        section.appendChild(ticker);
    }
    function appendServices(wrapper, v, options, t, locale) {
        if (options.view === "ultra" || options.view === "minimal" || options.hiddenFields.includes("service"))
            return;
        const messages = serviceMessages(v);
        if (!messages.length)
            return;
        const section = BMWCD.element("section", "bmwcd-services");
        section.appendChild(BMWCD.element("h3", "bmwcd-section-title xsmall dimmed regular", t("NEXT_SERVICE")));
        const next = messages[0];
        const status = BMWCD.text(next, "status");
        const tone = status?.toUpperCase() === "OVERDUE" ? "bmwcd-red" : "bright";
        const focus = BMWCD.element("div", "bmwcd-service-focus");
        focus.appendChild(BMWCD.element("div", `bmwcd-service-name small ${tone}`, serviceTitle(next, t)));
        const remaining = distance(next, locale);
        const due = BMWCD.text(next, "date");
        if (remaining) {
            focus.appendChild(BMWCD.element("div", "bmwcd-service-distance medium bright", remaining));
            focus.appendChild(BMWCD.element("div", "bmwcd-service-caption xsmall dimmed", t("SERVICE_REMAINING")));
        }
        const timing = [status ? BMWCD.state(status, t) : null, due && due !== "-" ? `${t("SERVICE_DUE")}: ${due}` : null];
        focus.appendChild(BMWCD.element("div", "bmwcd-service-meta xsmall dimmed", timing.filter(Boolean).join(" · ")));
        section.appendChild(focus);
        if (options.view === "service") {
            section.classList.add("bmwcd-service-strip");
            appendTicker(section, messages.slice(1), options, t, locale);
        }
        else if (messages.length > 1) {
            const list = BMWCD.element("ul", "bmwcd-service-list");
            messages.slice(1).forEach(message => {
                const item = BMWCD.element("li");
                const title = BMWCD.element("div", "bright", serviceTitle(message, t));
                if (BMWCD.text(message, "status")?.toUpperCase() === "OVERDUE")
                    title.classList.add("bmwcd-red");
                item.append(title, BMWCD.element("div", "bmwcd-service-meta xsmall dimmed", serviceInfo(message, t, locale)));
                list.appendChild(item);
            });
            section.appendChild(list);
        }
        wrapper.appendChild(section);
    }
    BMWCD.appendServices = appendServices;
})(BMWCD || (BMWCD = {}));
