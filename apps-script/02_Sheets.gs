function ss_() {
  return SpreadsheetApp.getActive();
}

function sh_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw new Error("Feuille manquante: " + name + " — execute setupWorkbook()");
  return s;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function rows_(name) {
  var sheet = sh_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { _row: i + 1 };
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
      if (values[i][c] !== "" && values[i][c] !== null) empty = false;
    }
    if (!empty) out.push(obj);
  }
  return out;
}

function rowToArray_(name, obj) {
  var headers = HEADERS[name];
  return headers.map(function (h) {
    var v = obj[h];
    if (v === true || v === false) return v;
    if (v === undefined || v === null) return "";
    return v;
  });
}

function appendRow_(name, obj) {
  sh_(name).appendRow(rowToArray_(name, obj));
}

function updateRow_(name, rowIndex, obj) {
  var headers = HEADERS[name];
  var sheet = sh_(name);
  var range = sheet.getRange(rowIndex, 1, 1, headers.length);
  range.setValues([rowToArray_(name, obj)]);
}

function findRow_(name, field, value) {
  var list = rows_(name);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i][field]) === String(value)) return list[i];
  }
  return null;
}

function deleteRowsWhere_(name, pred) {
  var list = rows_(name);
  for (var i = list.length - 1; i >= 0; i--) {
    if (pred(list[i])) sh_(name).deleteRow(list[i]._row);
  }
}

function setting_(key, fallback) {
  var list = rows_("Settings");
  for (var i = 0; i < list.length; i++) {
    if (list[i].key === key) return String(list[i].value);
  }
  return fallback == null ? "" : String(fallback);
}

function settingNum_(key, fallback) {
  return asNum_(setting_(key, fallback), fallback);
}

function audit_(action, userId, detail) {
  appendRow_("AuditLog", {
    log_id: uuid_(),
    action: action,
    user_id: userId || "",
    detail: String(detail || "").slice(0, 500),
    created_at: nowIso_(),
  });
}

function publicUser_(u) {
  return {
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    role: u.role,
    status: u.status,
    preferred_provider: u.preferred_provider,
    preferred_model: u.preferred_model,
    detail_level: u.detail_level,
    created_at: u.created_at,
    last_login: u.last_login,
  };
}

function publicKey_(k) {
  return {
    key_id: k.key_id,
    provider: k.provider,
    label: k.label,
    api_key_masked: maskKey_(k.api_key),
    base_url: k.base_url,
    priority: asNum_(k.priority, 10),
    status: k.status,
    cooldown_until: k.cooldown_until,
    used_today: asNum_(k.used_today, 0),
    daily_limit: asNum_(k.daily_limit, 0),
    last_error: k.last_error,
    last_used: k.last_used,
  };
}

function setupWorkbook() {
  var ss = ss_();
  // Arrêter avant toute initialisation si un schéma existant ne correspond pas :
  // updateRow_ écrit selon l'ordre de HEADERS et ne doit pas déplacer les données.
  SHEET_NAMES.forEach(function (name) {
    var existing = ss.getSheetByName(name);
    if (!existing || existing.getLastRow() === 0) return;
    var expected = HEADERS[name];
    var actual = existing.getRange(1, 1, 1, expected.length).getValues()[0];
    for (var i = 0; i < expected.length; i++) {
      if (String(actual[i]) !== expected[i]) throw new Error("En-tête incorrect dans " + name + " colonne " + (i + 1) + " : attendu " + expected[i]);
    }
  });
  SHEET_NAMES.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[name]);
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight("bold");
  });

  if (rows_("Settings").length === 0) {
    SEED_SETTINGS.forEach(function (pair) {
      appendRow_("Settings", { key: pair[0], value: pair[1] });
    });
  }
  if (rows_("Models").length === 0) {
    SEED_MODELS.forEach(function (m) {
      appendRow_("Models", {
        model_id: m[0], provider: m[1], display_name: m[2],
        context_max: m[3], output_max: m[4],
        supports_vision: m[5], supports_streaming: m[6], enabled: m[7],
      });
    });
  }
  if (rows_("Personas").length === 0) {
    appendRow_("Personas", {
      persona_id: uuid_(),
      name: "Movibot",
      version: 1,
      system_prompt: DEFAULT_PERSONA,
      is_active: true,
      updated_by: "system",
      updated_at: nowIso_(),
    });
  }
  if (rows_("Providers").length === 0) {
    appendRow_("Providers", {
      key_id: uuid_(),
      provider: "demo",
      label: "Mode demonstration (sans cle)",
      api_key: "demo",
      base_url: "",
      priority: 99,
      status: "active",
      cooldown_until: "",
      used_today: 0,
      daily_limit: 100000,
      last_error: "",
      last_used: "",
    });
  }
  hideApiKeyColumn_();
  return "Feuilles pretes.";
}

function hideApiKeyColumn_() {
  var sheet = sh_("Providers");
  var idx = HEADERS.Providers.indexOf("api_key") + 1;
  if (idx > 0) sheet.hideColumns(idx);
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyBackup").timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger("archiveOldMessages").timeBased().everyDays(1).atHour(4).create();
  ScriptApp.newTrigger("resetDailyCounters").timeBased().everyDays(1).atHour(0).create();
  return "Declencheurs installes (sauvegarde 3h, archivage 4h, compteurs 0h).";
}
