namespace BMWCD {
    function serviceTitle(message: Data, t: Translate): string {
        const title = (text(message, "title") || "").replace(/\s*\([^)]*\)/g, "").replace(/^Service\s*-\s*/i, "").trim();
        const names: Record<string, string> = {
            "running in check": "SERVICE_RUNNING_IN", "running-in check": "SERVICE_RUNNING_IN",
            "engine oil": "SERVICE_OIL", "vehicle check": "SERVICE_VEHICLE",
            "brake fluid": "SERVICE_BRAKE_FLUID", "statutory vehicle inspection": "SERVICE_INSPECTION",
        };
        return names[title.toLowerCase()] ? t(names[title.toLowerCase()]) : title;
    }

    function distance(message: Data, locale: string): string | null {
        const value = text(message, "unitOfLengthRemaining");
        if (!value || value === "-") return null;
        return /^-?\d+(\.\d+)?$/.test(value) ? number(Number(value), locale, 0) : value;
    }

    function serviceInfo(message: Data, t: Translate, locale: string): string {
        const status = text(message, "status");
        const parts = status ? [state(status, t)] : [];
        const remaining = distance(message, locale);
        if (remaining) parts.push(`${remaining} (${t("VEHICLE_UNIT")})`);
        const due = text(message, "date");
        if (due && due !== "-") parts.push(`${t("SERVICE_DUE")}: ${due}`);
        return parts.join(" · ");
    }

    export function serviceMessages(v: Data): Data[] {
        const messages = Array.isArray(v.service_messages)
            ? v.service_messages.map(record).filter(message => text(message, "title")) : [];
        const priority = (message: Data) => {
            const status = text(message, "status")?.toUpperCase();
            return status === "OVERDUE" ? 0 : status === "PENDING" || status === "DUE" ? 1 : status === "OK" ? 3 : 2;
        };
        return messages.sort((a, b) => priority(a) - priority(b));
    }

    function appendTicker(section: HTMLElement, messages: Data[], options: Options, t: Translate, locale: string): void {
        if (!messages.length) return;
        const ticker = element("div", "bmwcd-ticker");
        ticker.tabIndex = 0;
        ticker.setAttribute("aria-label", t("OTHER_SERVICES"));
        const track = element("div", "bmwcd-ticker-track");
        const duration = Number.isFinite(options.serviceScrollDuration) && options.serviceScrollDuration > 0
            ? options.serviceScrollDuration : 90;
        track.style.setProperty("--bmwcd-scroll-duration", `${duration}s`);
        const group = element("div", "bmwcd-ticker-group");
        messages.forEach(message => {
            const item = element("span", "bmwcd-ticker-item");
            const tone = text(message, "status")?.toUpperCase() === "OVERDUE" ? "bmwcd-red" : "bright";
            item.append(element("span", tone, serviceTitle(message, t)),
                element("span", "bmwcd-service-meta xsmall dimmed", serviceInfo(message, t, locale)));
            group.appendChild(item);
        });
        const duplicate = group.cloneNode(true) as HTMLElement;
        duplicate.setAttribute("aria-hidden", "true");
        track.append(group, duplicate);
        ticker.appendChild(track);
        section.appendChild(ticker);
    }

    export function appendServices(wrapper: HTMLElement, v: Data, options: Options, t: Translate, locale: string): void {
        if (options.view === "ultra" || options.view === "minimal" || options.hiddenFields.includes("service")) return;
        const messages = serviceMessages(v);
        if (!messages.length) return;
        const section = element("section", "bmwcd-services");
        section.appendChild(element("h3", "bmwcd-section-title xsmall dimmed regular", t("NEXT_SERVICE")));
        const next = messages[0];
        const status = text(next, "status");
        const tone = status?.toUpperCase() === "OVERDUE" ? "bmwcd-red" : "bright";
        const focus = element("div", "bmwcd-service-focus");
        focus.appendChild(element("div", `bmwcd-service-name small ${tone}`, serviceTitle(next, t)));
        const remaining = distance(next, locale);
        const due = text(next, "date");
        if (remaining) {
            focus.appendChild(element("div", "bmwcd-service-distance medium bright", remaining));
            focus.appendChild(element("div", "bmwcd-service-caption xsmall dimmed", t("SERVICE_REMAINING")));
        }
        const timing = [status ? state(status, t) : null, due && due !== "-" ? `${t("SERVICE_DUE")}: ${due}` : null];
        focus.appendChild(element("div", "bmwcd-service-meta xsmall dimmed", timing.filter(Boolean).join(" · ")));
        section.appendChild(focus);

        if (options.view === "service") {
            section.classList.add("bmwcd-service-strip");
            appendTicker(section, messages.slice(1), options, t, locale);
        } else if (messages.length > 1) {
            const list = element("ul", "bmwcd-service-list");
            messages.slice(1).forEach(message => {
                const item = element("li");
                const title = element("div", "bright", serviceTitle(message, t));
                if (text(message, "status")?.toUpperCase() === "OVERDUE") title.classList.add("bmwcd-red");
                item.append(title, element("div", "bmwcd-service-meta xsmall dimmed", serviceInfo(message, t, locale)));
                list.appendChild(item);
            });
            section.appendChild(list);
        }
        wrapper.appendChild(section);
    }
}
