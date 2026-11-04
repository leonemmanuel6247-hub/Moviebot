function demoReply_(messages, detailLevel) {
  var last = "";
  for (var i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      last = messages[i].content || "";
      break;
    }
  }
  var long = detailLevel !== "concise";
  var intro = long
    ? "Voici une reponse structuree, comme le ferait un assistant pedagogue."
    : "Reponse concise :";
  var extra = long
    ? "Je peux allonger, donner des contre-exemples, et adapter le niveau de detail selon tes parametres.\n"
    : "";
  return (
    intro +
    "\n\n## Idee generale\nTu as demande : « " +
    String(last).slice(0, 280) +
    " »\n\nEn **mode demonstration**, aucune cle API n'est configuree. Ajoute une cle dans l'espace administrateur.\n\n" +
    extra +
    "*Cette reponse est generee localement. Aucune cle n'a quitte le serveur.*"
  );
}

var GEMINI_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function geminiBuildUrl_(baseUrl, model) {
  var base = String(baseUrl).replace(/\/+$/, "");
  if (/\/generateContent$/i.test(base)) return base;
  if (/\/models\/[^/]+:generateContent$/i.test(base)) return base;
  if (/\/models$/i.test(base)) return base + "/" + model + ":generateContent";
  if (/generativelanguage\.googleapis\.com/i.test(base)) return base + "/models/" + model + ":generateContent";
  return base + "/generateContent";
}

function geminiNative_(baseUrl, apiKey, model, messages, maxTokens) {
  var system = "";
  var history = [];
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (m.role === "system") { system += m.content + "\n"; }
    else { history.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }); }
  }
  var payload = { contents: history };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };
  if (maxTokens) payload.generationConfig = { maxOutputTokens: maxTokens, temperature: 0.7 };

  // Si l'URL est deja complete (contient le modele), on ne teste qu'elle.
  var fixedUrl = /\/models\/[^/]+:generateContent$|\/generateContent$/i.test(String(baseUrl));
  var candidates = fixedUrl ? [model] : [model].concat(GEMINI_MODEL_FALLBACKS.filter(function (x) { return x !== model; }));
  var lastErr = null;
  var json = {}, code = 0, text = "";
  for (var c = 0; c < candidates.length; c++) {
    var url = geminiBuildUrl_(baseUrl, candidates[c]);
    var res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { "x-goog-api-key": apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeoutSeconds: 45,
    });
    code = res.getResponseCode();
    text = res.getContentText();
    json = {};
    try { json = JSON.parse(text); } catch (e) { json = {}; }
    if (code >= 200 && code < 300) {
      var content = ((((json.candidates || [])[0] || {}).content || {}).parts || []).map(function (p) { return p.text || ""; }).join("") || "";
      var um = (json.usageMetadata || {});
      return {
        content: content,
        tokensIn: um.promptTokenCount || estimateTokens_(messages.map(function (m) { return m.content; }).join(" ")),
        tokensOut: um.candidatesTokenCount || estimateTokens_(content),
        model: candidates[c],
      };
    }
    var emsg = ((((json.error || {}).details) || [])[0] || {}).message || (json.error && json.error.message) || text.slice(0, 300);
    lastErr = new Error(emsg || ("HTTP " + code));
    lastErr.status = code;
    // On ne reessaie que si c'est un probleme de modele introuvable.
    var modelIssue = code === 404 || /not found|is not supported|unknown model|invalid model/i.test(emsg || "");
    if (!modelIssue) throw lastErr;
  }
  throw lastErr || new Error("Gemini: aucun modele disponible");
}

function openaiCompatible_(baseUrl, apiKey, model, messages, maxTokens, extraHeaders, memoryContext) {
  var base = String(baseUrl).replace(/\/+$/, "");
  var url = base;
  if (!/\/chat\/completions$/i.test(base) && !/\/generate-content$|\/interactions$/i.test(base)) {
    url = base + "/chat/completions";
  }
  var headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  if (extraHeaders) {
    Object.keys(extraHeaders).forEach(function (k) {
      headers[k] = extraHeaders[k];
    });
  }
  var payload = { model: model, messages: messages, max_tokens: maxTokens || 2048, temperature: 0.7 };
  if (memoryContext && memoryContext.allowed) {
    payload.tools = [{type:"function", function:{name:"memoriser_preference", description:"Conserver une préférence cinéma sur demande explicite. Le contenu doit être un extrait exact du dernier message utilisateur, 160 caractères maximum.", parameters:{type:"object",properties:{content:{type:"string"}},required:["content"],additionalProperties:false}}}];
    payload.tool_choice = "auto";
  }
  var res = UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json", headers: headers,
    payload: JSON.stringify(payload), muteHttpExceptions: true, timeoutSeconds: 45,
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  var json = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { error: { message: text.slice(0, 400) } };
  }
  // Gemini renvoie parfois une erreur sous forme de tableau [{error:{...}}].
  if (Array.isArray(json)) json = json[0] || {};
  if (code < 200 || code >= 300) {
    var emsg = (json.error && (json.error.message || (json.error.details && json.error.details[0] && json.error.details[0].message))) || json.message || text.slice(0, 300) || ("HTTP " + code);
    var err = new Error(emsg);
    err.status = code;
    throw err;
  }
  var message = (((json.choices || [])[0] || {}).message || {});
  var calls = message.tool_calls || [];
  if (calls.length) {
    // Un seul appel par réponse ; ne jamais réessayer après une écriture réussie.
    if (!memoryContext || !memoryContext.allowed || calls.length !== 1 || !calls[0].function || calls[0].function.name !== "memoriser_preference") {
      return {content:"Je ne peux pas effectuer cette opération de mémoire. Vous pouvez gérer vos souvenirs dans les paramètres.",tokensIn:0,tokensOut:0};
    }
    var args;
    try { args = JSON.parse(calls[0].function.arguments || "{}"); } catch (e) { args = {}; }
    var saved = saveAgentMemory_(memoryContext.userId, memoryContext.latestText, args.content);
    return {content:saved.ok ? "C’est noté, j’ai enregistré cette préférence dans votre mémoire : « " + saved.content + " »." : "Je n’ai pas enregistré de souvenir : " + saved.error, tokensIn:(json.usage || {}).prompt_tokens || 0, tokensOut:(json.usage || {}).completion_tokens || 0, tool_events:[{type:"memory", status:saved.ok ? "success" : "error", label:saved.ok ? "Mémoire mise à jour" : "Mémoire non mise à jour"}]};
  }
  var content = message.content || "";
  var usage = json.usage || {};
  return {
    content: content,
    tokensIn: usage.prompt_tokens || estimateTokens_(messages.map(function (m) { return m.content; }).join(" ")),
    tokensOut: usage.completion_tokens || estimateTokens_(content),
  };
}

function cohereChat_(baseUrl, apiKey, model, messages, maxTokens) {
  var system = messages
    .filter(function (m) { return m.role === "system"; })
    .map(function (m) { return m.content; })
    .join("\n");
  var history = [];
  var rest = messages.filter(function (m) { return m.role !== "system"; });
  for (var i = 0; i < rest.length; i++) {
    history.push({ role: rest[i].role === "assistant" ? "assistant" : "user", content: rest[i].content });
  }
  var url = String(baseUrl || "https://api.cohere.com/v2").replace(/\/+$/, "");
  if (!/\/chat$/i.test(url)) url += "/chat";
  var payload = { model: model || "command-r-plus", messages: history, max_tokens: maxTokens || 2048 };
  if (system) payload.system = system;
  var res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeoutSeconds: 45,
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  var json = {};
  try { json = JSON.parse(text); } catch (e) { json = {}; }
  if (code < 200 || code >= 300) {
    var err = new Error(json.message || (json.error && json.error.message) || text.slice(0, 300) || ("HTTP " + code));
    err.status = code;
    throw err;
  }
  var content = "";
  try {
    var c = json.message && json.message.content;
    if (Array.isArray(c)) content = c.map(function (x) { return x.text || ""; }).join("");
    else content = json.text || "";
  } catch (e) { content = json.text || ""; }
  var usage = json.usage || {};
  var inT = (usage.input_tokens) || (usage.billed_units && usage.billed_units.input_tokens) || estimateTokens_(rest.map(function (m) { return m.content; }).join(" "));
  var outT = (usage.output_tokens) || (usage.billed_units && usage.billed_units.output_tokens) || estimateTokens_(content);
  return {
    content: content,
    tokensIn: inT,
    tokensOut: outT,
  };
}

function callProvider_(opts) {
  var provider = opts.provider;
  var apiKey = opts.apiKey;
  var model = opts.model;
  var messages = opts.messages;
  var maxTokens = opts.maxTokens;
  var detailLevel = opts.detailLevel;
  if (provider === "demo" || apiKey === "demo") {
    var content = demoReply_(messages, detailLevel);
    return {
      content: content,
      tokensIn: estimateTokens_(messages.map(function (m) { return m.content; }).join(" ")),
      tokensOut: estimateTokens_(content),
      provider: "demo",
      model: "demo-pedagogue",
    };
  }
  if (provider === "cohere") {
    var r = cohereChat_(opts.baseUrl, apiKey, model, messages, maxTokens);
    r.provider = provider;
    r.model = model;
    return r;
  }
  var url = opts.baseUrl || PROVIDER_URLS[provider];
  if (!url) {
    var err = new Error("Fournisseur inconnu: " + provider);
    err.status = 400;
    throw err;
  }
  var extra = {};
  if (provider === "openrouter") {
    extra["HTTP-Referer"] = "https://movibot.app";
    extra["X-Title"] = "Movibot";
  }
  var isGeminiNative = /generativelanguage\.googleapis\.com\//.test(url) && !/\/openai/i.test(url);
  var out;
  if (isGeminiNative) {
    out = geminiNative_(url, apiKey, model, messages, maxTokens);
  } else {
    out = openaiCompatible_(url, apiKey, model, messages, maxTokens, extra, opts.memoryContext);
  }
  out.provider = provider;
  if (!out.model) out.model = model;
  return out;
}

function pickKeys_(provider) {
  var t = Date.now();
  var want = String(provider || "").trim().toLowerCase();
  var all = rows_("Providers").filter(function (k) {
    return String(k.provider || "").trim().toLowerCase() === want;
  });
  var usable = all.filter(function (k) {
    var status = String(k.status || "").trim().toLowerCase();
    if (!status || status === "active") return true;
    if (status === "cooling_down" && k.cooldown_until && new Date(k.cooldown_until).getTime() < t) return true;
    return false;
  });
  var pool = usable; // Respecter les périodes de refroidissement et clés désactivées.
  return pool.sort(function (a, b) {
    var p = asNum_(a.priority, 10) - asNum_(b.priority, 10);
    if (p !== 0) return p;
    return asNum_(a.used_today, 0) - asNum_(b.used_today, 0);
  });
}

function markKeySuccess_(key) {
  key.used_today = asNum_(key.used_today, 0) + 1;
  key.last_used = nowIso_();
  key.last_error = "";
  if (key.status === "cooling_down") key.status = "active";
  updateRow_("Providers", key._row, key);
}

function markKeyError_(key, message, status) {
  key.last_error = String(message || "").slice(0, 240);
  if (status === 429) {
    var mins = settingNum_("cooldown_minutes", 10);
    key.status = "cooling_down";
    key.cooldown_until = new Date(Date.now() + mins * 60 * 1000).toISOString();
  } else if (status === 401 || status === 403) {
    key.status = "disabled";
  }
  updateRow_("Providers", key._row, key);
}

function tryProviders_(preferred, model, messages, maxTokens, detailLevel, memoryContext, image) {
  var models = rows_("Models").filter(function (m) { return asBool_(m.enabled) && m.provider !== "demo"; });
  var priority = "qwen/qwen3.8-27b", fallback = setting_("fallback_provider", "openrouter");
  var ordered = models.slice().sort(function(a,b) {
    function rank(m) { if (m.provider === preferred && m.model_id === model) return 0; if (m.provider === "groq" && m.model_id === priority) return 1; if (m.provider === preferred) return 2; if (m.provider === fallback) return 3; return 4; }
    return rank(a)-rank(b);
  });
  if (image) ordered = ordered.filter(function(m) { return m.provider === "groq" && m.model_id === priority && asBool_(m.supports_vision); });
  var lastError = "", attempts = 0, start = Date.now();
  for (var i=0; i<ordered.length && attempts<8 && Date.now()-start<110000; i++) {
    var m=ordered[i], keys=pickKeys_(m.provider);
    for (var k=0; k<keys.length && k<2 && attempts<8; k++) {
      attempts++;
      try {
        var input = messages;
        if (image) {
          input = messages.map(function(x){return {role:x.role, content:x.content};});
          var attached = false;
          for (var j=input.length-1; j>=0; j--) if (input[j].role === "user") { input[j].content = [{type:"text",text:String(input[j].content)},{type:"image_url",image_url:{url:image}}]; attached = true; break; }
          if (!attached) throw new Error("Le message dépasse le budget de contexte disponible.");
        }
        var output = callProvider_({provider:m.provider,apiKey:keys[k].api_key,baseUrl:keys[k].base_url,model:m.model_id,messages:input,maxTokens:Math.min(maxTokens || 2048, asNum_(m.output_max,2048)),detailLevel:detailLevel,memoryContext:memoryContext});
        if (!output || !String(output.content || "").trim()) throw new Error("Réponse vide du fournisseur");
        try { markKeySuccess_(keys[k]); } catch (counterError) {}
        return output;
      } catch(e) {
        lastError = e.message || String(e);
        try { markKeyError_(keys[k], lastError, e.status || 0); } catch (logError) {}
        // Une clé limitée ou invalide ne doit pas être retentée pour d'autres modèles.
        if (e.status === 429 || e.status === 401 || e.status === 403) continue;
      }
    }
  }
  throw new Error(image ? "Aucun modèle vision compatible disponible pour cette image. Réessayez plus tard." : "Tous les modèles disponibles ont échoué. Réessayez plus tard.");
}
