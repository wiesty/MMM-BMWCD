Module.register("MMM-BMWCD", {
    defaults: {
        // Base URL of your bmw-cardata-bridge instance.
        bridgeUrl: "http://192.168.1.1:8080",

        // VIN to display. If set, fetches /vehicle/{vin} — required when the bridge
        // tracks multiple vehicles (BMW_VINS). If null, fetches /vehicle (single-vehicle mode).
        vin: null,

        // Display name shown in the module header (e.g. "BMW X3 2023").
        vehicleName: "My BMW",

        // Path to a vehicle image. Supports:
        //   - relative path (served from this module's folder):  "x3.png"
        //   - absolute server path:                              "/images/car.png"
        //   - absolute URL:                                      "https://example.com/car.png"
        // Set to null to hide the image.
        vehicleImage: null,

        // API key — only needed if API_KEY is configured on the bridge.
        // Sent as X-API-Key header.
        apiKey: null,

        // How often to refresh data from the bridge (milliseconds).
        updateInterval: 60 * 1000,
        animationSpeed: 800,

        // Fields to hide. Add any combination of the following keys:
        //   "mileage"    — Kilometerstand
        //   "range"      — Reichweite (elektrisch / gesamt)
        //   "range_fuel" — Kraftstoffreichweite (ICE/PHEV)
        //   "doors"      — Türen / Verriegelung
        //   "battery"    — Akkustand (BEV/PHEV)
        //   "fuel"       — Kraftstoffstand
        //   "plug"       — Ladekabel-Status
        //   "charging"   — Ladevorgang / Ladezeit
        //   "tires"      — Reifendruck (alle 4 Räder)
        // Example: hiddenFields: ["tires", "doors"]
        hiddenFields: [],
    },

    start: function () {
        this.vehicleData = null;
        this.error = null;
        this.fetchData();
        setInterval(() => this.fetchData(), this.config.updateInterval);
    },

    getStyles: function () {
        return ["MMM-BMWCD.css"];
    },

    getTranslations: function () {
        return {
            de: "translations/de.json",
            en: "translations/en.json",
            fr: "translations/fr.json",
            es: "translations/es.json",
            it: "translations/it.json",
            nl: "translations/nl.json",
            pl: "translations/pl.json",
            pt: "translations/pt.json",
        };
    },

    isVisible: function (field) {
        return !this.config.hiddenFields.includes(field);
    },

    resolveImageSrc: function (path) {
        if (!path) return null;
        // Absolute URL (http/https)
        if (/^https?:\/\//i.test(path)) return path;
        // Absolute server path (starts with /)
        if (path.startsWith("/")) return path;
        // Relative — serve from this module's folder
        return `modules/MMM-BMWCD/${path}`;
    },

    fetchData: function () {
        const url = this.config.vin
            ? `${this.config.bridgeUrl}/vehicle/${this.config.vin}`
            : `${this.config.bridgeUrl}/vehicle`;

        const headers = {};
        if (this.config.apiKey) {
            headers["X-API-Key"] = this.config.apiKey;
        }

        Log.info("[MMM-BMWCD] Fetching:", url);
        fetch(url, { headers })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                this.vehicleData = data;
                this.error = null;
                this.updateDom(this.config.animationSpeed);
            })
            .catch(err => {
                Log.error("[MMM-BMWCD] Fetch error:", err.message);
                this.error = err.message;
                this.updateDom(this.config.animationSpeed);
            });
    },

    formatDate: function (isoString) {
        if (!isoString) return "—";
        return new Date(isoString).toLocaleString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        wrapper.className = "bmwcd-wrapper";

        if (this.error || !this.vehicleData) {
            wrapper.className += " dimmed light small";
            wrapper.innerText = this.error ? this.translate("CONNECTION_ERROR") : this.translate("LOADING");
            return wrapper;
        }

        const v = this.vehicleData;
        const locked = v.doors_locked === "SECURED";

        // --- Header ---
        const header = document.createElement("div");
        header.className = "bmwcd-header";

        const imgSrc = this.resolveImageSrc(this.config.vehicleImage);
        if (imgSrc) {
            const img = document.createElement("img");
            img.className = "bmwcd-img";
            img.src = imgSrc;
            img.onerror = () => img.remove();
            header.appendChild(img);
        }

        const headerText = document.createElement("div");
        headerText.className = "bmwcd-header-text";
        headerText.innerHTML = `
            <div class="bright bmwcd-title">${this.config.vehicleName}</div>
            <div class="dimmed xsmall">${this.formatDate(v.last_update)}</div>
        `;
        header.appendChild(headerText);
        wrapper.appendChild(header);

        // --- Stats table ---
        const table = document.createElement("table");
        table.className = "bmwcd-table small";

        const rows = [];

        if (this.isVisible("mileage")) {
            rows.push([
                `<i class="fas fa-gauge-high"></i> ${this.translate("MILEAGE")}`,
                `<span class="bright">${v.mileage_km.toLocaleString("de-DE")} km</span>`,
            ]);
        }

        const mainRange = v.range_km ?? v.range_fuel_km;
        if (this.isVisible("range") && mainRange != null) {
            rows.push([
                `<i class="fas fa-road"></i> ${this.translate("RANGE")}`,
                `<span class="bright">${mainRange} km</span>`,
            ]);
        }

        if (this.isVisible("range_fuel") && v.range_fuel_km != null && v.range_km != null && v.range_fuel_km !== v.range_km) {
            rows.push([
                `<i class="fas fa-gas-pump"></i> ${this.translate("RANGE_FUEL")}`,
                `<span class="bright">${v.range_fuel_km} km</span>`,
            ]);
        }

        if (this.isVisible("doors")) {
            rows.push([
                `<i class="fas fa-${locked ? "lock" : "lock-open"}"></i> ${this.translate("DOORS")}`,
                `<span class="${locked ? "bright" : "bmwcd-red"}">${locked ? this.translate("LOCKED") : this.translate("UNLOCKED")}</span>`,
            ]);
        }

        if (this.isVisible("battery") && v.battery_soc_pct != null) {
            const soc = v.battery_soc_pct;
            const barClass = soc <= 10 ? "bmwcd-red" : soc <= 25 ? "bmwcd-dim" : "";
            rows.push([
                `<i class="fas fa-bolt"></i> ${this.translate("BATTERY")}`,
                `<span class="bright">${soc}%</span>
                 <span class="bmwcd-bar-bg"><span class="bmwcd-bar-fill ${barClass}" style="width:${Math.max(soc, 2)}%"></span></span>`,
            ]);
        }

        if (this.isVisible("fuel") && v.fuel_level_pct != null) {
            const pct = v.fuel_level_pct;
            const barClass = pct <= 10 ? "bmwcd-red" : pct <= 25 ? "bmwcd-dim" : "";
            rows.push([
                `<i class="fas fa-gas-pump"></i> ${this.translate("FUEL")}`,
                `<span class="bright">${pct}%</span>
                 <span class="bmwcd-bar-bg"><span class="bmwcd-bar-fill ${barClass}" style="width:${Math.max(pct, 2)}%"></span></span>`,
            ]);
        }

        if (this.isVisible("plug") && v.is_plugged_in != null) {
            rows.push([
                `<i class="fas fa-plug"></i> ${this.translate("PLUG")}`,
                `<span class="${v.is_plugged_in ? "bright" : "dimmed"}">${v.is_plugged_in ? this.translate("CONNECTED") : this.translate("DISCONNECTED")}</span>`,
            ]);
        }

        if (this.isVisible("charging") && v.charging_status != null && v.charging_status === "CHARGING") {
            const label = v.charging_time_remaining_min
                ? this.translate("CHARGING_REMAINING").replace("{minutes}", Math.round(v.charging_time_remaining_min))
                : this.translate("CHARGING_ACTIVE");
            rows.push([
                `<i class="fas fa-charging-station"></i> ${this.translate("CHARGING")}`,
                `<span class="bright">${label}</span>`,
            ]);
        }

        if (this.isVisible("tires") && v.tire_pressure_fl_kpa != null) {
            const bar = kpa => (kpa / 100).toFixed(1);
            const tp = (pos, val) => `<span class="bmwcd-tire-cell"><span class="dimmed xsmall">${pos}</span> <span class="bright">${bar(val)}</span></span>`;
            rows.push([
                `<i class="fas fa-circle-dot"></i> ${this.translate("TIRES")}`,
                `<span class="bmwcd-tire-grid">
                    ${tp("VL", v.tire_pressure_fl_kpa)}${tp("VR", v.tire_pressure_fr_kpa)}
                    ${tp("HL", v.tire_pressure_rl_kpa)}${tp("HR", v.tire_pressure_rr_kpa)}
                 </span>`,
            ]);
        }

        rows.forEach(([label, value]) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td class="dimmed">${label}</td><td class="bmwcd-val">${value}</td>`;
            table.appendChild(tr);
        });

        wrapper.appendChild(table);
        return wrapper;
    },
});
