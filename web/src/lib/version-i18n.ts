type TranslateFn = (key: string) => string;

export function getTranslatedSessionTitle(
  tSession: TranslateFn,
  version: string,
  fallback: string
) {
  const translated = tSession(version);
  return translated === version ? fallback : translated;
}

export function getTranslatedLayerLabel(
  tLayer: TranslateFn,
  layer: string,
  fallback: string
) {
  const translated = tLayer(layer);
  return translated === layer ? fallback : translated;
}

export function getTranslatedVersionField(
  tMeta: TranslateFn,
  version: string,
  field: "subtitle" | "coreAddition" | "keyInsight",
  fallback: string
) {
  const key = `${version}_${field}`;
  const translated = tMeta(key);
  return translated === key ? fallback : translated;
}
