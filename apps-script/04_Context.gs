function applyDetail_(prompt, level) {
  if (level === "concise") {
    return prompt + "\n\nNiveau de detail demande: CONCIS. Reponses courtes, essentiels seulement.";
  }
  if (level === "balanced") return prompt + "\n\nNiveau de detail demande: EQUILIBRE. Reponse claire, ni trop courte ni trop longue.";
  if (level === "expert") {
    return prompt + "\n\nNiveau de detail demande: EXPERT. Aller en profondeur, nuances, pieges, references.";
  }
  return prompt + "\n\nNiveau de detail demande: DETAILLE. Expliquer etape par etape avec exemples.";
}

function buildContext_(opts) {
  var budgetSetting = settingNum_("context_budget", 8000);
  var reserve = settingNum_("output_reserve", 1500);
  var limit = Math.min(asNum_(opts.contextMax, 8192), budgetSetting);
  var sys = applyDetail_(opts.systemPrompt, opts.detailLevel);
  var sysTokens = estimateTokens_(sys);
  var budget = Math.max(500, limit - reserve - sysTokens);
  var messages = opts.messages || [];
  var packed = [];
  var used = 0;
  for (var i = messages.length - 1; i >= 0; i--) {
    var t = asNum_(messages[i].tokens_est, 0) || estimateTokens_(messages[i].content);
    if (used + t > budget) break;
    packed.unshift({ role: messages[i].role, content: messages[i].content });
    used += t;
  }
  var dropped = messages.length - packed.length;
  var out = [{ role: "system", content: sys }];
  if (dropped > 0 && opts.summary) {
    out.push({
      role: "system",
      content: "Resume des echanges precedents (ne pas citer comme un message utilisateur):\n" + opts.summary,
    });
  }
  for (var j = 0; j < packed.length; j++) out.push(packed[j]);
  return { messages: out, dropped: dropped, usedTokens: used + sysTokens, budget: budget };
}

function needsSummarize_(dropped) {
  return dropped >= 6;
}

function makeSummaryPrompt_(oldSummary, oldMessages) {
  var blob = oldMessages
    .map(function (m) { return m.role + ": " + m.content; })
    .join("\n")
    .slice(0, 6000);
  return [
    { role: "system", content: "Tu resumes une conversation de facon factuelle et courte (12 lignes max). Conserve les decisions, noms, chiffres, objectifs. Pas de style." },
    { role: "user", content: "Ancien resume:\n" + (oldSummary || "(aucun)") + "\n\nMessages a fusionner:\n" + blob },
  ];
}
