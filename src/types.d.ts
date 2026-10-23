declare namespace BMWCD {
    type Data = Record<string, unknown>;
    type Translate = (key: string) => string;
    type Tone = "bright" | "dimmed" | "bmwcd-red" | "bmwcd-green";

    interface Options {
        view: "minimal" | "service" | "full";
        bridgeUrl: string;
        vin: string | null;
        vehicleName: string | null;
        vehicleImage: string | null;
        imageHeight: number;
        apiKey: string | null;
        updateInterval: number;
        requestTimeout: number;
        animationSpeed: number;
        staleAfter: number;
        hiddenFields: string[];
        showLocation: boolean;
        showTelematics: boolean;
        showTireTargets: boolean;
        serviceScrollDuration: number;
    }

    interface Row {
        key: string;
        label: string;
        icon: string;
        value: string;
        tone?: Tone;
        lines?: { label: string; value: string; tone?: Tone }[];
        percent?: number;
        title?: string;
    }

    interface View {
        data: Data | null;
        error: string | null;
        options: Options;
        locale: string;
        translate: Translate;
        imageSrc: string | null;
        now?: number;
    }

    interface ModuleInstance {
        defaults: Options;
        config: Options;
        vehicleData: Data | null;
        error: string | null;
        timer: ReturnType<typeof setTimeout> | null;
        controller: AbortController | null;
        suspended: boolean;
        locale: string;
        lastRenderSignature: string | null;
        start(): void;
        suspend(): void;
        resume(): void;
        getScripts(): string[];
        getStyles(): string[];
        getTranslations(): Record<string, string>;
        fetchData(): Promise<void>;
        getDom(): HTMLElement;
        file(path: string): string;
        translate: Translate;
        updateDom(speed: number): void;
    }
}

declare const config: { language?: string };
declare const Module: {
    register(name: string, definition: Partial<BMWCD.ModuleInstance> & ThisType<BMWCD.ModuleInstance>): void;
};
declare const Log: { error(message: string): void };
