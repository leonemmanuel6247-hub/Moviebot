/**
 * Movibot — diagnostic complet
 *
 * But : executer toutes les actions et toutes les verifications de configuration,
 * et journaliser chaque erreur dans une feuille "DiagnosticLog" + Logger.
 *
 * Fonctions :
 *   diagnosticComplet()          -> verifie configuration + feuil, journalise tout
 *   diagnosticToutesActions()    -> execute CHAQUE action de ACTIONS, journalise OK/ERREUR
 *   diagnosticViderLog()         -> vide la feuille DiagnosticLog (options)
 */

function diagnosticLogSheet_() {
  var ss = ss_();
  var sheet = ss.getSheetByName("DiagnosticLog");
  if (!sheet) {
    sheet = ss.insertSheet("DiagnosticLog");
    sheet.appendRow(["timestamp", "categorie", "cle", "statut", "detail"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sheet;
}

function logDiag_(categorie, cle, statut, detail) {
  try {
    diagnosticLogSheet_().appendRow([nowIso_(), categorie, String(cle), String(statut), String(detail || "")]);
  } catch (e) {
    Logger.log("Impossible d'ecrire le log: " + e.message);
  }
  Logger.log("[" + categorie + "] " + cle + " -> " + statut + (detail ? " :: " + detail : ""));
}

function assertHeader_(name) {
  var issues = [];
  var sheet = sh_(name);
  var headers = HEADERS[name] || [];
  var row1 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  for (var i = 0; i < headers.length; i++) {
    if (row1[i] !== headers[i]) {
      issues.push("colonne " + (i + 1) + ": attendu '" + headers[i] + "' obtenu '" + row1[i] + "'");
    }
  }
  if (sheet.getLastColumn() > headers.length) {
    issues.push("colonnes en trop au-dela de la colonne " + headers.length);
  }
  return issues;
}

/**
 * Verification de la configuration complete.
 */
function diagnosticComplet() {
  var ok = 0;
  var errs = 0;
  var warns = 0;

  function report(categorie, cle, statut, detail) {
    logDiag_(categorie, cle, statut, detail);
    if (statut === "ERREUR") errs++;
    else if (statut === "ATTENTION") warns++;
    else ok++;
  }

  report("config", "feuilles", "OK", "nombre feuilles attendues: " + SHEET_NAMES.length);

  SHEET_NAMES.forEach(function (name) {
    var sheet = ss_().getSheetByName(name);
    if (!sheet) {
      report("feuille", name, "ERREUR", "feuille absente — executer setupWorkbook()");
      return;
    }
    var issues = assertHeader_(name);
    if (issues.length) {
      report("feuille", name, "ERREUR", issues.join(" ; "));
    } else {
      report("feuille", name, "OK", "en-tetes conformes, " + Math.max(0, sheet.getLastRow() - 1) + " ligne(s)");
    }
  });

  // Utilisateurs
  var users = rows_("Users");
  report("donnees", "utilisateurs", "OK", users.length + " utilisateur(s)");
  var admin = users.filter(function (u) { return u.role === "admin"; });
  if (!admin.length) {
    report("donnees", "admin", "INFO", "aucun admin — le 1er inscrit recevra le role admin");
  } else {
    report("donnees", "admin", "OK", admin.length + " admin(s)");
  }

  // Providers
  var providers = rows_("Providers");
  if (!providers.length) {
    report("donnees", "providers", "ERREUR", "aucune cle fournisseur");
  } else {
    var active = providers.filter(function (k) { return k.status === "active"; });
    var nonDemo = active.filter(function (k) { return k.provider !== "demo"; });
    if (!nonDemo.length) {
      report("donnees", "providers", "ATTENTION", "seule la cle demo est active — chat en mode demo");
    } else {
      report("donnees", "providers", "OK", active.length + " cle(s) active(s), " + nonDemo.length + " hors demo");
    }
    providers.forEach(function (k) {
      if (!k.provider) report("donnees", "provider-ligne", "ERREUR", "ligne " + k._row + " sans provider");
      if (k.provider !== "demo" && !k.api_key) report("donnees", "provider-" + (k.key_id || k._row), "ATTENTION", "cle vide pour " + k.provider);
    });
  }

  // Modeles
  var models = rows_("Models");
  var enabled = models.filter(function (m) { return asBool_(m.enabled); });
  report("donnees", "modeles", "OK", models.length + " modele(s), " + enabled.length + " active(s)");
  if (!enabled.length) report("donnees", "modeles", "ERREUR", "aucun modele actif");

  // Personas
  var personas = rows_("Personas");
  var personaActif = personas.filter(function (p) { return asBool_(p.is_active); });
  report("donnees", "personas", "OK", personas.length + " persona(s), " + personaActif.length + " active(s)");
  if (!personaActif.length) report("donnees", "personas", "ERREUR", "aucune persona active");

  // Declencheurs
  var triggers = ScriptApp.getProjectTriggers();
  report("config", "declencheurs", "OK", triggers.length + " declencheur(s)");
  if (!triggers.length) report("config", "declencheurs", "ATTENTION", "aucun — executer installTriggers()");

  // Web app
  var url = ScriptApp.getService().getUrl();
  report("config", "webapp", url ? "OK" : "ATTENTION", url || "pas de deploiement web actif");

  report("bilan", "diagnostic", "TERMINE", "OK=" + ok + " ERREURS=" + errs + " ATTENTIONS=" + warns);
  return "Diagnostic termine: OK=" + ok + ", ERREURS=" + errs + ", ATTENTIONS=" + warns + " — voir feuille DiagnosticLog.";
}

/**
 * Retourne un token de session pour le premier utilisateur existant,
 * ou null si aucun compte n'existe (aucun compte n'est cree ici).
 */
function diagAuth_() {
  var users = rows_("Users");
  if (!users.length) return null;
  var u = users[0];
  var token = randomToken_();
  appendRow_("Sessions", {
    session_id: uuid_(),
    user_id: u.user_id,
    token_hash: sha256Hex_(token),
    device: "diagnostic",
    created_at: nowIso_(),
    expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
    revoked: false,
  });
  return token;
}

function makeBody_(action, token) {
  var base = { action: action, token: token || "", device: "diagnostic" };
  switch (action) {
    case "register":
      return Object.assign({}, base, {
        email: "diag-" + Date.now() + "@movibot.test",
        password: "Diag1234!",
        display_name: "Diagnostic",
      });
    case "verify_email":
      return Object.assign({}, base, { email: "diag@movibot.test", code: "000000" });
    case "login":
      return Object.assign({}, base, { email: "diag@movibot.test", password: "Diag1234!" });
    case "forgot_password":
      return Object.assign({}, base, { email: "diag@movibot.test" });
    case "reset_password":
      return Object.assign({}, base, { email: "diag@movibot.test", code: "000000", password: "Diag1234!" });
    case "create_conversation":
      return Object.assign({}, base, { title: "Test diagnostic" });
    case "send_message":
      return Object.assign({}, base, { conv_id: "_diag_", content: "Bonjour, reponds en une phrase.", persona_id: "" });
    case "update_profile":
      return Object.assign({}, base, { display_name: "Diagnostic" });
    default:
      return base;
  }
}

function isSafeAction_(action) {
  var dangerous = [
    "delete_account", "logout_all", "logout",
    "admin_set_user", "admin_add_key", "admin_update_key",
    "admin_save_persona", "admin_activate_persona", "admin_improve_persona",
    "admin_save_model", "admin_save_settings",
    "archive_conversation", "delete_conversation",
    "save_preferences", "add_memory", "update_memory", "delete_memory", "clear_memories",
    "add_cinema_item", "delete_cinema_item", "pin_conversation",
    "verify_email", "reset_password",
    "diag_provider",
  ];
  return dangerous.indexOf(action) === -1;
}

/**
 * Execute chaque action du routeur et journalise le resultat.
 * Les actions destructives/ecritures sensibles sont sautees en lecture seule (STATUT "SIGNE-SKIP").
 */
function diagnosticToutesActions() {
  var token = diagAuth_();
  var ids = Object.keys(ACTIONS);
  var ok = 0;
  var errs = 0;
  var skipped = 0;

  if (!token) {
    logDiag_("actions", "utilisateurs", "ATTENTION", "aucun compte — actions authentifiees non testees");
    skipped++;
  }
  logDiag_("actions", "demarrage", "OK", ids.length + " action(s) a tester");

  ids.forEach(function (action) {
    var body = makeBody_(action, token || "");
    if (!isSafeAction_(action)) {
      logDiag_("action", action, "SKIP", "action non executee (sensible/destructive) — pas de test auto");
      skipped++;
      return;
    }
    if (!token && action !== "health" && action !== "register" && action !== "login" && action !== "forgot_password") {
      logDiag_("action", action, "SKIP", "aucun compte — pas de session de test");
      skipped++;
      return;
    }
    try {
      var res = route_(action, body);
      if (res && res.ok === false) {
        logDiag_("action", action, "ERREUR", "code=" + (res.code || "?") + " msg=" + res.error);
        errs++;
      } else {
        logDiag_("action", action, "OK", "reponse recue");
        ok++;
      }
    } catch (e) {
      logDiag_("action", action, "ERREUR", (e.stack || e.message || String(e)).split("\n").slice(0, 3).join(" | "));
      errs++;
    }
  });

  logDiag_("bilan", "toutes-actions", "TERMINE", "OK=" + ok + " ERREURS=" + errs + " SKIP=" + skipped);
  return "Actions testees: OK=" + ok + ", ERREURS=" + errs + ", SKIP=" + skipped + " — voir feuille DiagnosticLog.";
}

function diagnosticViderLog() {
  var sheet = ss_().getSheetByName("DiagnosticLog");
  if (!sheet) return "Pas de feuille DiagnosticLog.";
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  return "Log vide.";
}

/**
 * Active manuellement un compte existant (passe son statut en "active")
 * sans passer par le code de verification email.
 * Usage: activerCompte("ton@email.com")
 */
function activerCompte(email) {
  var u = findUserByEmail_(String(email || "").trim().toLowerCase());
  if (!u) return "Aucun compte avec cet email.";
  if (u.status === "active") return "Le compte est deja actif.";
  u.status = "active";
  updateRow_("Users", u._row, u);
  return "Compte active pour " + email;
}
