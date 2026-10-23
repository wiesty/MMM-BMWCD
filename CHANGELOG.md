# Changelog

## 1.2.0 — 2026-10-23

- Add minimal, service and full views using MagicMirror's native typography.
- Display expanded BMW CarData Gateway telemetry, closure status, tyre targets and service messages.
- Highlight open and unlocked states in red and confirmed closed and locked states in green.
- Add a service ticker and translated short names for standard BMW service entries.
- Show configurable vehicle images above the metrics, with an adjustable maximum height.
- Keep cached values on connection errors and distinguish vehicle reading time from gateway poll time.
- Avoid refresh fades, overlapping requests and unnecessary DOM replacements.
- Handle partial responses, request timeouts and module suspension.
- Include eight translations, TypeScript sources, generated browser scripts and regression tests with synthetic data.

## 0.0.1

- Initial BMW CarData display module.
