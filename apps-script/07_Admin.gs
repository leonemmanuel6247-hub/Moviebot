function action_admin_users(body) {
  requireAdmin_(body);
  return ok_({ users: rows_("Users").map(publicUser_) });
}

function action_admin_set_user(body) {
  var auth = requireAdmin_(body);
  withLock_(function () {
    var u = findUser_(body.user_id);
    if (!u) return;
    if (body.status) u.status = body.status;
    if (body.role) u.role = body.role;
    updateRow_("Users", u._row, u);
  });
  audit_("admin_set_user", auth.user.user_id, body.user_id + " " + (body.status || "") + " " + (body.role || ""));
  return ok_({});
}

function action_admin_keys(body) {
  requireAdmin_(body);
  return ok_({ keys: rows_("Providers").map(publicKey_) });
}

function action_admin_add_key(body) {
  var auth = requireAdmin_(body);
  var provider = String(body.provider || "").trim().toLowerCase();
  var api_key = String(body.api_key || "").trim();
  if (!provider || !api_key) return fail_("Fournisseur et cle requis", "VALIDATION");
  var row = {
    key_id: uuid_(),
    provider: provider,
    label: String(body.label || (provider + " " + Date.now())).slice(0, 80),
    api_key: api_key,
    base_url: String(body.base_url || ""),
    priority: asNum_(body.priority, 10),
    status: "active",
    cooldown_until: "",
    used_today: 0,
    daily_limit: asNum_(body.daily_limit, 10000),
    last_error: "",
    last_used: "",
  };
  withLock_(function () { appendRow_("Providers", row); });
  audit_("admin_add_key", auth.user.user_id, provider + " " + maskKey_(api_key));
  return ok_({ key: publicKey_(row) });
}

function action_admin_update_key(body) {
  var auth = requireAdmin_(body);
  withLock_(function () {
    var k = findRow_("Providers", "key_id", body.key_id);
    if (!k) return;
    if (body.status) k.status = body.status;
    if (body.priority != null) k.priority = asNum_(body.priority, k.priority);
    if (body.label) k.label = String(body.label);
    if (body.daily_limit != null) k.daily_limit = asNum_(body.daily_limit, k.daily_limit);
    if (body.api_key) k.api_key = String(body.api_key);
    if (body.base_url != null) k.base_url = String(body.base_url);
    updateRow_("Providers", k._row, k);
  });
  audit_("admin_update_key", auth.user.user_id, body.key_id);
  return ok_({});
}

function action_admin_test_key(body) {
  requireAdmin_(body);
  var k = findRow_("Providers", "key_id", body.key_id);
  if (!k) return fail_("Cle introuvable", "NOT_FOUND");
  var model = null;
  var models = rows_("Models");
  for (var i = 0; i < models.length; i++) {
    if (models[i].provider === k.provider && asBool_(models[i].enabled)) {
      model = models[i];
      break;
    }
  }
  try {
    var r = callProvider_({
      provider: k.provider,
      apiKey: k.api_key,
      baseUrl: k.base_url,
      model: model ? model.model_id : "demo-pedagogue",
      messages: [
        { role: "system", content: "Reponds par un seul mot: OK" },
        { role: "user", content: "ping" },
      ],
      maxTokens: 16,
      detailLevel: "concise",
    });
    return ok_({ result: String(r.content).slice(0, 200), provider: r.provider });
  } catch (e) {
    return fail_(e.message || "Echec du test", "AI_ERROR");
  }
}

function action_admin_personas(body) {
  requireAdmin_(body);
  var list = rows_("Personas");
  list.forEach(function (p) { delete p._row; });
  return ok_({ personas: list });
}

function action_admin_save_persona(body) {
  var auth = requireAdmin_(body);
  var name = String(body.name || "Pedagogue").slice(0, 80);
  var system_prompt = String(body.system_prompt || "").trim();
  if (!system_prompt) return fail_("Prompt requis", "VALIDATION");
  var versions = rows_("Personas").filter(function (p) { return p.name === name; });
  var version = 1;
  versions.forEach(function (p) {
    var v = asNum_(p.version, 0);
    if (v >= version) version = v + 1;
  });
  var row = {
    persona_id: uuid_(),
    name: name,
    version: version,
    system_prompt: system_prompt,
    is_active: !!body.activate,
    updated_by: auth.user.user_id,
    updated_at: nowIso_(),
  };
  withLock_(function () {
    if (row.is_active) {
      rows_("Personas").forEach(function (p) {
        p.is_active = false;
        updateRow_("Personas", p._row, p);
      });
    }
    appendRow_("Personas", row);
  });
  audit_("admin_save_persona", auth.user.user_id, name + " v" + version);
  return ok_({ persona: row });
}

function action_admin_activate_persona(body) {
  var auth = requireAdmin_(body);
  withLock_(function () {
    rows_("Personas").forEach(function (p) {
      p.is_active = p.persona_id === body.persona_id;
      updateRow_("Personas", p._row, p);
    });
  });
  audit_("admin_activate_persona", auth.user.user_id, body.persona_id);
  return ok_({});
}

function action_admin_improve_persona(body) {
  requireAdmin_(body);
  var current = findRow_("Personas", "persona_id", body.persona_id);
  if (!current) {
    var all = rows_("Personas");
    for (var i = 0; i < all.length; i++) {
      if (asBool_(all[i].is_active)) current = all[i];
    }
  }
  if (!current) return fail_("Personnalite introuvable", "NOT_FOUND");
  var goal = String(body.goal || "plus pedagogue");
  var msgs = [
    { role: "system", content: "Tu ameliore un prompt systeme. Renvoie uniquement le nouveau prompt, sans commentaire." },
    { role: "user", content: "Objectif: " + goal + "\n\nPrompt actuel:\n" + current.system_prompt },
  ];
  var r = tryProviders_("demo", "demo-pedagogue", msgs, 1200, "detailed");
  return ok_({ suggestion: r.content, based_on: current.persona_id });
}

function action_admin_models(body) {
  requireAdmin_(body);
  var list = rows_("Models");
  list.forEach(function (m) { delete m._row; });
  return ok_({ models: list });
}

function action_admin_save_model(body) {
  requireAdmin_(body);
  withLock_(function () {
    var list = rows_("Models");
    var m = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].model_id === body.model_id && list[i].provider === body.provider) m = list[i];
    }
    if (!m) {
      appendRow_("Models", {
        model_id: body.model_id,
        provider: body.provider,
        display_name: body.display_name || body.model_id,
        context_max: asNum_(body.context_max, 8192),
        output_max: asNum_(body.output_max, 2048),
        supports_vision: !!body.supports_vision,
        supports_streaming: !!body.supports_streaming,
        enabled: body.enabled !== false,
      });
    } else {
      m.display_name = body.display_name || m.display_name;
      m.context_max = asNum_(body.context_max, m.context_max);
      m.output_max = asNum_(body.output_max, m.output_max);
      m.enabled = body.enabled !== false;
      updateRow_("Models", m._row, m);
    }
  });
  return ok_({});
}

function action_admin_settings(body) {
  requireAdmin_(body);
  var list = rows_("Settings");
  list.forEach(function (s) { delete s._row; });
  return ok_({ settings: list });
}

function action_admin_save_settings(body) {
  var auth = requireAdmin_(body);
  var entries = body.settings || {};
  withLock_(function () {
    Object.keys(entries).forEach(function (key) {
      var row = findRow_("Settings", "key", key);
      if (row) {
        row.value = String(entries[key]);
        updateRow_("Settings", row._row, row);
      } else {
        appendRow_("Settings", { key: key, value: String(entries[key]) });
      }
    });
  });
  audit_("admin_save_settings", auth.user.user_id, Object.keys(entries).join(","));
  return ok_({});
}

function action_admin_usage(body) {
  requireAdmin_(body);
  var usage = rows_("Usage").slice(-500);
  var auditRows = rows_("AuditLog").slice(-300);
  usage.forEach(function (u) { delete u._row; });
  auditRows.forEach(function (a) { delete a._row; });
  return ok_({ usage: usage, audit: auditRows });
}

function action_admin_stats(body) {
  requireAdmin_(body);
  var today = nowIso_().slice(0, 10);
  var usageToday = 0;
  rows_("Usage").forEach(function (u) {
    if (String(u.created_at).indexOf(today) === 0) usageToday++;
  });
  return ok_({
    users: rows_("Users").length,
    conversations: rows_("Conversations").length,
    messages: rows_("Messages").length,
    keys: rows_("Providers").length,
    usage_today: usageToday,
  });
}

/**
 * Diagnostic d'un fournisseur : montre ce que voit le moteur (toutes les cles,
 * celles retenues, le modele choisi) et effectue un appel reel pour reveler l'erreur.
 * body.provider = "gemini"
 */
function action_diag_provider(body) {
  requireAdmin_(body);
  var provider = String(body.provider || "").trim().toLowerCase();
  var all = rows_("Providers").filter(function (k) {
    return String(k.provider || "").trim().toLowerCase() === provider;
  });
  var picked = pickKeys_(provider);
  var models = rows_("Models").filter(function (m) {
    return String(m.provider || "").trim().toLowerCase() === provider && asBool_(m.enabled);
  });
  var keyRows = all.map(function (k) {
    return {
      key_id: k.key_id,
      status: k.status,
      used_today: k.used_today,
      daily_limit: k.daily_limit,
      base_url: k.base_url,
      last_error: k.last_error,
      last_used: k.last_used,
      has_key: !!k.api_key,
      picked: picked.some(function (p) { return p.key_id === k.key_id; }),
    };
  });
  var test = null;
  if (picked.length) {
    try {
      var modelId = models.length ? models[0].model_id : (provider + "-default");
      var r = callProvider_({
        provider: provider,
        apiKey: picked[0].api_key,
        baseUrl: picked[0].base_url,
        model: modelId,
        messages: [
          { role: "system", content: "Reponds par un seul mot: OK" },
          { role: "user", content: "ping" },
        ],
        maxTokens: 16,
        detailLevel: "concise",
      });
      test = { ok: true, model: modelId, base_url_used: picked[0].base_url || "(defaut)", content: String(r.content).slice(0, 200) };
    } catch (e) {
      test = { ok: false, model: models.length ? models[0].model_id : "", base_url_used: picked[0].base_url || "(defaut)", error: String(e.message || e), status: e.status || 0 };
    }
  } else {
    test = { ok: false, error: "Aucune cle retenue pour ce fournisseur (voir keyRows)" };
  }
  return ok_({
    provider: provider,
    keys_found: all.length,
    keys_picked: picked.length,
    default_url: PROVIDER_URLS[provider] || "",
    models: models.map(function (m) { return m.model_id; }),
    keyRows: keyRows,
    test: test,
  });
}
