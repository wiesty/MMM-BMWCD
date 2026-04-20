# MMM-BMWCD
### MagicMirror BMW CarData

A [MagicMirror²](https://magicmirror.builders) module that displays live bmw vehicle data from a [bmw-cardata-bridge](https://github.com/wiesty/bmw-cardata-bridge) instance.

Supports single- and multi-vehicle setups, optional API key authentication, and both BEV and ICE vehicles (fields are shown/hidden automatically based on what your vehicle reports).

---

## Preview

![MMM-BMWCD Demo](/.github/assets/demo.jpeg)

---

## What it shows

- Mileage
- Range (electric, fuel, or both for PHEV)
- Battery state of charge + charge bar (BEV/PHEV)
- Fuel level + bar (ICE/PHEV)
- Plug status + active charging with remaining time (BEV/PHEV)
- Door lock status
- Last data update timestamp

---

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/wiesty/bmw-cardata-bridge MMM-BMWCD
# only the MMM-BMWCD/ subdirectory is the module — see below
```

Or copy the `MMM-BMWCD/` folder from the [bmw-cardata-bridge](https://github.com/wiesty/bmw-cardata-bridge) repository directly into your `~/MagicMirror/modules/` directory.

---

## Configuration

Add to your `config/config.js`:

### Single vehicle (bridge with one VIN)

```js
{
    module: "MMM-BMWCD",
    position: "top_left",
    config: {
        bridgeUrl: "http://192.168.1.1:8080",
        vehicleName: "BMW X3",
        vehicleImage: "x3.png",  // relative (module dir), "/abs/path.png", or "https://...", or leave empty
    }
}
```

### Specific VIN (bridge with multiple VINs)

When the bridge is configured with `BMW_VINS=VIN1,VIN2`, you must specify which VIN to display:

```js
{
    module: "MMM-BMWCD",
    position: "top_left",
    config: {
        bridgeUrl: "http://192.168.1.1:8080",
        vin: "WBA12345678901234",
        vehicleName: "BMW X3",
        vehicleImage: "x3.png",
    }
}
```

To show a second vehicle, add a second module instance with a different `vin` and `position`.

### With API key

If the bridge is configured with `API_KEY`:

```js
{
    module: "MMM-BMWCD",
    position: "top_left",
    config: {
        bridgeUrl: "http://192.168.1.1:8080",
        vin: "WBA12345678901234",
        vehicleName: "BMW X3",
        apiKey: "your-secret-key",
    }
}
```

---

## All config options

| Option | Default | Description |
|--------|---------|-------------|
| `bridgeUrl` | `http://192.168.1.1:8080` | Base URL of your bmw-cardata-bridge instance |
| `vin` | `null` | VIN to display. Required when bridge tracks multiple vehicles. `null` uses the single-vehicle `/vehicle` endpoint |
| `vehicleName` | `"My BMW"` | Display name shown in the header |
| `vehicleImage` | `null` | Vehicle image path. Relative (`"x3.png"` → module dir), absolute server path (`"/images/car.png"`), or full URL. `null` = no image |
| `apiKey` | `null` | API key sent as `X-API-Key` header — only needed if `API_KEY` is set on the bridge |
| `updateInterval` | `60000` | How often to refresh data (ms) |
| `animationSpeed` | `800` | DOM update animation speed (ms) |
| `hiddenFields` | `[]` | List of field keys to hide. See [Field Keys](#field-keys) below |

---

## Field Keys

Use `hiddenFields` to hide any combination of these keys:

| Key | Label |
|-----|-------|
| `mileage`    | Kilometerstand |
| `range`      | Reichweite (elektrisch / gesamt) |
| `range_fuel` | Kraftstoffreichweite (nur PHEV, wenn abweichend von `range`) |
| `doors`      | Türen / Verriegelung |
| `battery`    | Akkustand (BEV/PHEV) |
| `fuel`       | Kraftstoffstand |
| `plug`       | Ladekabel-Status |
| `charging`   | Ladevorgang / Ladezeit |
| `tires`      | Reifendruck (VL / VR / HL / HR in bar) |

**Example** — hide tyre pressure and doors:

```js
hiddenFields: ["tires", "doors"]
```

---

## Vehicle images

The module does not automatically fetch vehicle images. You have a few options:

**Option A — BMW Press / Media (free, registration required)**
BMW provides high-quality renders at [bmwgroup.com/en/company/company-newsroom](https://www.bmwgroup.com/en/company/company-newsroom.html). Registration is free; images are available for editorial use.

**Option B — BMW Configurator screenshot**
Build your exact car at [bmw.de](https://www.bmw.de) or your country's BMW site and screenshot the render. Works well for personal/home use.

**Option C — Wikimedia Commons**
Search [commons.wikimedia.org](https://commons.wikimedia.org) for your model — many high-quality free photos are available under Creative Commons.

**Option D — Your own photo**
A photo you took works great too. Crop to landscape, export as PNG with a transparent background for the cleanest look.

Place the image file in `~/MagicMirror/modules/MMM-BMWCD/` and reference it as `vehicleImage: "yourfile.png"`. You can also use an absolute server path like `vehicleImage: "/images/car.png"` or a full URL.

---

## Translations

The module automatically uses MagicMirror's configured language. Supported languages:

| Code | Language   |
|------|------------|
| `de` | Deutsch    |
| `en` | English    |
| `fr` | Français   |
| `es` | Español    |
| `it` | Italiano   |
| `nl` | Nederlands |
| `pl` | Polski     |
| `pt` | Português  |

Falls back to English if the configured language is not in this list.

---

## Requirements

- [MagicMirror²](https://magicmirror.builders) v2.x
- A running [bmw-cardata-bridge](https://github.com/wiesty/bmw-cardata-bridge) instance reachable from the MagicMirror host
- Font Awesome icons (included in MagicMirror by default)
