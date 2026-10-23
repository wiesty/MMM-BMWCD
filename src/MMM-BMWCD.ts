// Generated JavaScript is shipped with the module. Edit this TypeScript source.
Module.register("MMM-BMWCD", {
    defaults: {
        view: "minimal",
        bridgeUrl: "http://192.168.1.1:8080",
        vin: null,
        vehicleName: null,
        vehicleImage: null,
        imageHeight: 220,
        apiKey: null,
        updateInterval: 60 * 1000,
        requestTimeout: 10 * 1000,
        animationSpeed: 0,
        hiddenFields: [],
        showLocation: false,
        showTelematics: false,
        showTireTargets: true,
        serviceScrollDuration: 90,
    },

    start: function () {
        this.vehicleData = null;
        this.error = null;
        this.timer = null;
        this.controller = null;
        this.suspended = false;
        this.locale = typeof config !== "undefined" && config.language ? config.language : "en";
        this.lastRenderSignature = null;
        void this.fetchData();
    },

    getScripts: function () {
        return ["lib/data.js", "lib/rows.js", "lib/details.js", "lib/compact.js", "lib/service.js", "lib/render.js"].map(path => this.file(path));
    },

    getStyles: function () {
        return ["MMM-BMWCD.css"];
    },

    getTranslations: function () {
        // MagicMirror uses the first entry as the fallback language.
        return {
            en: "translations/en.json", de: "translations/de.json", fr: "translations/fr.json",
            es: "translations/es.json", it: "translations/it.json", nl: "translations/nl.json",
            pl: "translations/pl.json", pt: "translations/pt.json",
        };
    },

    suspend: function () {
        this.suspended = true;
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        this.controller?.abort();
        this.controller = null;
    },

    resume: function () {
        this.suspended = false;
        void this.fetchData();
    },

    fetchData: async function () {
        if (this.suspended || this.controller) return;
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        const controller = new AbortController();
        this.controller = controller;
        const timeoutMs = Number.isFinite(this.config.requestTimeout) && this.config.requestTimeout > 0
            ? this.config.requestTimeout : this.defaults.requestTimeout;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let errorKey = "CONNECTION_ERROR";
        try {
            const base = this.config.bridgeUrl.replace(/\/+$/, "");
            const vin = this.config.vin?.trim();
            const url = `${base}/vehicle${vin ? `/${encodeURIComponent(vin)}` : ""}`;
            const headers: Record<string, string> = {};
            if (this.config.apiKey) headers["X-API-Key"] = this.config.apiKey;
            const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
            if (!response.ok) {
                errorKey = ({ 400: "SELECT_VIN", 401: "AUTH_ERROR", 403: "AUTH_ERROR",
                    404: "VEHICLE_NOT_FOUND", 503: "NO_DATA" } as Record<number, string>)[response.status] || "CONNECTION_ERROR";
                throw new Error(`HTTP ${response.status}`);
            }
            errorKey = "INVALID_DATA";
            const data: unknown = await response.json();
            if (!BMWCD.isVehicle(data)) throw new Error("Invalid vehicle response");
            if (this.suspended || this.controller !== controller || controller.signal.aborted) return;
            this.vehicleData = data;
            this.error = null;
        } catch {
            if (this.suspended || this.controller !== controller) return;
            this.error = controller.signal.aborted ? "REQUEST_TIMEOUT" : errorKey;
            // Do not log URLs, VINs, API keys or vehicle response bodies.
            Log.error(`[MMM-BMWCD] ${this.error}`);
        } finally {
            clearTimeout(timeout);
            if (this.controller === controller) {
                this.controller = null;
                if (!this.suspended) {
                    const signature = JSON.stringify([this.vehicleData, this.error]);
                    if (signature !== this.lastRenderSignature) {
                        this.lastRenderSignature = signature;
                        // A refresh must not hide/show the entire MagicMirror module.
                        this.updateDom(0);
                    }
                    const interval = Number.isFinite(this.config.updateInterval) && this.config.updateInterval > 0
                        ? Math.max(1000, this.config.updateInterval) : this.defaults.updateInterval;
                    this.timer = setTimeout(() => { void this.fetchData(); }, interval);
                }
            }
        }
    },

    getDom: function () {
        return BMWCD.render({
            data: this.vehicleData,
            error: this.error,
            options: this.config,
            locale: this.locale,
            translate: key => this.translate(key),
            imageSrc: BMWCD.imageSource(this.config.vehicleImage, path => this.file(path)),
        });
    },
});
