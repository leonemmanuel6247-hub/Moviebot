var HASH_ITERS = 8000;

function nowIso_() {
  return new Date().toISOString();
}

function uuid_() {
  return Utilities.getUuid();
}

function randomToken_() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
}

function randomSalt_() {
  return Utilities.getUuid().replace(/-/g, "");
}

function sixDigitCode_() {
  return ("000000" + Math.floor(Math.random() * 1000000)).slice(-6);
}

function sha256Hex_(value) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  var out = "";
  for (var i = 0; i < raw.length; i++) {
    var v = (raw[i] + 256) % 256;
    out += ("0" + v.toString(16)).slice(-2);
  }
  return out;
}

function hashPassword_(password, salt) {
  var h = sha256Hex_(String(password) + ":" + String(salt));
  for (var i = 0; i < HASH_ITERS; i++) {
    h = sha256Hex_(h + ":" + salt);
  }
  return h;
}

function verifyPassword_(password, salt, hash) {
  return hashPassword_(password, salt) === hash;
}

function estimateTokens_(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(String(text).length / 3.7));
}

function maskKey_(key) {
  if (!key || String(key).length < 8) return "****";
  return "****" + String(key).slice(-4);
}

function asBool_(v) {
  if (v === true || v === "true" || v === "TRUE" || v === 1 || v === "1") return true;
  return false;
}

function asNum_(v, fallback) {
  var n = Number(v);
  return isFinite(n) ? n : (fallback || 0);
}
