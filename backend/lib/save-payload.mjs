import CryptoJS from "crypto-js";

const SAVE_ENCRYPTION_KEY = "taoyuanxiang_2024_secret";

function isPlainJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Canonical JSON representation: object key order is ignored, array order is kept. */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function decryptSaveRaw(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(raw, SAVE_ENCRYPTION_KEY);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    const parsed = JSON.parse(text);
    return isPlainJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function validateSavePayload(raw, data) {
  if (!isPlainJsonObject(data)) {
    return { ok: false, code: "INVALID_SAVE_DATA", reason: "invalid_data" };
  }
  const decrypted = decryptSaveRaw(raw);
  if (!decrypted) {
    return { ok: false, code: "INVALID_SAVE_RAW", reason: "raw_decrypt_failed" };
  }
  if (canonicalJson(decrypted) !== canonicalJson(data)) {
    return { ok: false, code: "SAVE_RAW_DATA_MISMATCH", reason: "raw_data_mismatch" };
  }
  return { ok: true, data: decrypted };
}
