# http-accept-language-kit

[![npm version](https://img.shields.io/npm/v/http-accept-language-kit.svg)](https://www.npmjs.com/package/http-accept-language-kit)
[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Recoveredd/http-accept-language-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Recoveredd/http-accept-language-kit/actions/workflows/ci.yml)

Parse, inspect, format, and lightly match HTTP `Accept-Language` headers.

`http-accept-language-kit` is a clean-room TypeScript package for apps that need the raw header turned into predictable data. It has no runtime dependencies, no mutable global language registry, and no Node-only APIs.

## Demo

Try the browser demo: [packages.wasta-wocket.fr/http-accept-language-kit](https://packages.wasta-wocket.fr/http-accept-language-kit/).

## Package quality

- TypeScript types are generated from the source.
- ESM-only package with no runtime dependencies.
- Marked as side-effect free for bundlers.
- CI runs `npm ci`, `typecheck`, `build`, and `test`.
- Tested on Node.js 20 and 22 with GitHub Actions.
- Browser-friendly implementation with no Node-only APIs.

## Install

```bash
npm install http-accept-language-kit
```

## Quick Start

```ts
import { formatAcceptLanguage, parseAcceptLanguage, pickAcceptedLanguage } from "http-accept-language-kit";

const parsed = parseAcceptLanguage("fr-CA, fr;q=0.8, en-US;q=0.6");

if (parsed.ok) {
  console.log(parsed.languages[0]);
  // { range: "fr-CA", quality: 1, order: 0, raw: "fr-CA", subtags: ["fr", "CA"] }
}

const selected = pickAcceptedLanguage(parsed.input, ["en-US", "fr-FR"]);
// "fr-FR"

const normalized = formatAcceptLanguage(parsed.languages);
// "fr-CA, fr;q=0.8, en-US;q=0.6"
```

## Why This Package

Use this when you want to inspect the header itself before deciding what to do:

- stable diagnostics for malformed ranges, duplicate `q` values, and wildcard handling;
- sorted structured results while preserving original order and raw tokens;
- a tiny matcher for exact, base-language, and wildcard cases;
- browser-friendly code that also works in workers, CLIs, and server middleware.

It is not a full locale negotiation framework and does not try to implement every language matching algorithm from ECMA-402 or BCP 47.

By default, q-values follow HTTP qvalue precision and allow at most three decimal places. Import tools that need to accept looser legacy input can opt into `allowExtendedQualityPrecision`.

## API

### `parseAcceptLanguage(input, options?)`

Returns `{ ok, input, languages, diagnostics }`. Valid languages are sorted by quality by default.

```ts
const result = parseAcceptLanguage("da, en-GB;q=0.8, en;q=0.7");
```

### `formatAcceptLanguage(languages, options?)`

Formats parsed language items back to a compact header value.

```ts
formatAcceptLanguage(result.languages, { precision: 2 });
```

### `pickAcceptedLanguage(header, supportedLanguages, options?)`

Returns the first supported language matched by quality order. Matching is intentionally small: exact match, base language match, then wildcard.

```ts
pickAcceptedLanguage("fr-CA, en;q=0.8", ["en-US", "fr-FR"]);
```

## Parse Options

| Option | Default | Description |
| --- | --- | --- |
| `allowWildcard` | `true` | Accept `*` ranges while still reporting a wildcard diagnostic. |
| `allowExtendedQualityPrecision` | `false` | Accept q-values with more than three decimal places. |
| `clampQuality` | `false` | Clamp out-of-range q values instead of rejecting them. |
| `keepInvalid` | `false` | Include invalid items in `languages` for UI review flows. |
| `sort` | `true` | Sort by descending q value and then original order. |

## Format Options

| Option | Default | Description |
| --- | --- | --- |
| `includeQualityOne` | `false` | Emit `;q=1` for full-quality ranges. |
| `precision` | `3` | Maximum decimal places for q values. |

## Diagnostics

Diagnostics are stable strings intended for logs, UI hints, and tests:

- `invalid-input`
- `empty-header`
- `empty-item`
- `invalid-language-range`
- `invalid-parameter`
- `invalid-quality`
- `quality-precision-exceeded`
- `duplicate-quality`
- `quality-clamped`
- `wildcard-range`

## License

MPL-2.0
