export type AcceptLanguageDiagnosticCode =
  | "invalid-input"
  | "empty-header"
  | "empty-item"
  | "invalid-language-range"
  | "invalid-parameter"
  | "invalid-quality"
  | "quality-precision-exceeded"
  | "duplicate-quality"
  | "quality-clamped"
  | "wildcard-range";

export type AcceptLanguageDiagnostic = {
  code: AcceptLanguageDiagnosticCode;
  message: string;
  index?: number;
  token?: string;
};

export type AcceptLanguageItem = {
  range: string;
  quality: number;
  order: number;
  raw: string;
  subtags: string[];
};

export type ParseAcceptLanguageOptions = {
  allowWildcard?: boolean;
  allowExtendedQualityPrecision?: boolean;
  clampQuality?: boolean;
  keepInvalid?: boolean;
  sort?: boolean;
};

export type ParseAcceptLanguageResult = {
  ok: boolean;
  input: string;
  languages: AcceptLanguageItem[];
  diagnostics: AcceptLanguageDiagnostic[];
};

export type FormatAcceptLanguageOptions = {
  includeQualityOne?: boolean;
  precision?: number;
};

const languageRangePattern = /^(?:\*|[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*)$/;

const defaultParseOptions = {
  allowWildcard: true,
  allowExtendedQualityPrecision: false,
  clampQuality: false,
  keepInvalid: false,
  sort: true
} satisfies Required<ParseAcceptLanguageOptions>;

const defaultFormatOptions = {
  includeQualityOne: false,
  precision: 3
} satisfies Required<FormatAcceptLanguageOptions>;

export function parseAcceptLanguage(
  input: unknown,
  options: ParseAcceptLanguageOptions = {}
): ParseAcceptLanguageResult {
  const settings = { ...defaultParseOptions, ...options };

  if (typeof input !== "string") {
    return {
      ok: false,
      input: "",
      languages: [],
      diagnostics: [
        diagnostic("invalid-input", "Accept-Language must be provided as a string.")
      ]
    };
  }

  const source = input.trim();
  const diagnostics: AcceptLanguageDiagnostic[] = [];
  const languages: AcceptLanguageItem[] = [];

  if (source.length === 0) {
    return {
      ok: false,
      input,
      languages,
      diagnostics: [diagnostic("empty-header", "Accept-Language is empty.")]
    };
  }

  for (const [index, rawPart] of source.split(",").entries()) {
    const raw = rawPart.trim();

    if (raw.length === 0) {
      diagnostics.push(diagnostic("empty-item", "Empty language item.", index));
      continue;
    }

    const segments = raw.split(";").map((part) => part.trim());
    const range = normalizeRange(segments[0] ?? "");
    let quality = 1;
    let sawQuality = false;
    let valid = true;

    if (!isValidRange(range)) {
      valid = false;
      diagnostics.push(
        diagnostic("invalid-language-range", "Invalid language range.", index, range)
      );
    }

    if (range === "*" && !settings.allowWildcard) {
      valid = false;
      diagnostics.push(diagnostic("wildcard-range", "Wildcard ranges are disabled.", index, range));
    } else if (range === "*") {
      diagnostics.push(diagnostic("wildcard-range", "Wildcard language range.", index, range));
    }

    for (const parameter of segments.slice(1)) {
      if (parameter.length === 0) continue;
      const [rawName = "", rawValue = ""] = parameter.split("=");
      const name = rawName.trim().toLowerCase();
      const value = rawValue.trim();

      if (name !== "q") {
        valid = false;
        diagnostics.push(diagnostic("invalid-parameter", "Only q parameters are supported.", index, parameter));
        continue;
      }

      if (sawQuality) {
        valid = false;
        diagnostics.push(diagnostic("duplicate-quality", "Duplicate q parameter.", index, parameter));
        continue;
      }

      sawQuality = true;
      const parsedQuality = Number(value);

      if (!isValidQuality(value, parsedQuality)) {
        valid = false;
        diagnostics.push(diagnostic("invalid-quality", "Quality must be a number from 0 to 1.", index, parameter));
        continue;
      }

      if (parsedQuality < 0 || parsedQuality > 1) {
        if (!settings.clampQuality) {
          valid = false;
          diagnostics.push(diagnostic("invalid-quality", "Quality must be between 0 and 1.", index, parameter));
          continue;
        }

        quality = Math.min(1, Math.max(0, parsedQuality));
        diagnostics.push(diagnostic("quality-clamped", "Quality was clamped to the 0..1 range.", index, parameter));
      } else {
        if (!settings.allowExtendedQualityPrecision && !isRfcQualityPrecision(value, parsedQuality)) {
          valid = false;
          diagnostics.push(
            diagnostic(
              "quality-precision-exceeded",
              "Quality can use at most three decimal places in HTTP qvalue syntax.",
              index,
              parameter
            )
          );
          continue;
        }

        quality = parsedQuality;
      }
    }

    if (valid || settings.keepInvalid) {
      languages.push({
        range,
        quality,
        order: index,
        raw,
        subtags: range === "*" ? ["*"] : range.split("-")
      });
    }
  }

  const ordered = settings.sort
    ? [...languages].sort((left, right) => right.quality - left.quality || left.order - right.order)
    : languages;

  return {
    ok: ordered.length > 0 && !diagnostics.some((entry) => entry.code !== "wildcard-range"),
    input,
    languages: ordered,
    diagnostics
  };
}

export function formatAcceptLanguage(
  languages: readonly AcceptLanguageItem[],
  options: FormatAcceptLanguageOptions = {}
): string {
  const settings = { ...defaultFormatOptions, ...options };
  const precision = Math.max(0, Math.min(6, Math.trunc(settings.precision)));

  return languages
    .map((language) => {
      if (language.quality === 1 && !settings.includeQualityOne) return language.range;
      return `${language.range};q=${trimQuality(language.quality, precision)}`;
    })
    .join(", ");
}

export function pickAcceptedLanguage(
  header: unknown,
  supportedLanguages: readonly string[],
  options: ParseAcceptLanguageOptions = {}
): string | undefined {
  const parsed = parseAcceptLanguage(header, options);
  if (!parsed.ok) return undefined;

  const supported = supportedLanguages.map((language) => ({
    original: language,
    normalized: normalizeRange(language)
  })).filter((language) => isValidRange(language.normalized));

  for (const accepted of parsed.languages) {
    if (accepted.quality <= 0) continue;

    const exact = supported.find((language) => language.normalized === accepted.range);
    if (exact) return exact.original;

    if (accepted.range === "*") return supported[0]?.original;

    const acceptedBase = accepted.range.split("-")[0];
    const baseMatch = supported.find(
      (language) =>
        language.normalized === acceptedBase || language.normalized.startsWith(`${acceptedBase}-`)
    );
    if (baseMatch) return baseMatch.original;
  }

  return undefined;
}

function normalizeRange(range: string): string {
  return range
    .trim()
    .split("-")
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.toLowerCase() : part.toUpperCase()))
    .join("-");
}

function isValidRange(range: string): boolean {
  return languageRangePattern.test(range);
}

function isValidQuality(raw: string, quality: number): boolean {
  return raw.length > 0 && Number.isFinite(quality) && /^-?\d+(?:\.\d+)?$/.test(raw);
}

function isRfcQualityPrecision(raw: string, quality: number): boolean {
  if (quality === 1) return /^1(?:\.0{0,3})?$/.test(raw);
  if (quality >= 0 && quality < 1) return /^0(?:\.\d{0,3})?$/.test(raw);
  return false;
}

function trimQuality(quality: number, precision: number): string {
  const bounded = Math.min(1, Math.max(0, quality));
  return bounded.toFixed(precision).replace(/\.?0+$/, "");
}

function diagnostic(
  code: AcceptLanguageDiagnosticCode,
  message: string,
  index?: number,
  token?: string
): AcceptLanguageDiagnostic {
  return { code, message, ...(index === undefined ? {} : { index }), ...(token ? { token } : {}) };
}
