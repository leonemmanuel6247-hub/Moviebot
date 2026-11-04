function findUserByEmail_(email) {
  var list = rows_("Users");
  var needle = String(email || "").toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].email).toLowerCase() === needle) return list[i];
  }
  return null;
}

function findUser_(id) {
  return findRow_("Users", "user_id", id);
}

function sessionFromToken_(token) {
  if (!token) return null;
  var hash = sha256Hex_(token);
  var list = rows_("Sessions");
  var s = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].token_hash === hash && !asBool_(list[i].revoked)) {
      s = list[i];
      break;
    }
  }
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) return null;
  var user = findUser_(s.user_id);
  if (!user || user.status !== "active") return null;
  return { session: s, user: user };
}

function requireAuth_(body) {
  var auth = sessionFromToken_(body.token);
  if (!auth) {
    var err = new Error("Session invalide ou expiree");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  return auth;
}

function requireAdmin_(body) {
  var auth = requireAuth_(body);
  if (auth.user.role !== "admin") {
    var err = new Error("Acces administrateur requis");
    err.code = "FORBIDDEN";
    throw err;
  }
  return auth;
}

function sendMailCode_(email, code, purpose) {
  var subject = purpose === "reset" ? "Movibot — reinitialisation du mot de passe" : "Movibot — verification de l'email";
  var body =
    "Bonjour,\n\nVotre code Movibot est : " + code + "\nIl expire dans 15 minutes.\n\nSi vous n'etes pas a l'origine de cette demande, ignorez ce message.";
  try {
    MailApp.sendEmail(email, subject, body);
    return true;
  } catch (e) {
    return false;
  }
}

function action_register(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var password = String(body.password || "");
  var display_name = String(body.display_name || "").trim();
  if (!email || email.indexOf("@") === -1) return fail_("Email invalide", "VALIDATION");
  if (password.length < 8) return fail_("Mot de passe trop court (8 caracteres min.)", "VALIDATION");
  if (!display_name) return fail_("Nom affiche requis", "VALIDATION");
  if (findUserByEmail_(email)) return fail_("Cet email est deja utilise", "CONFLICT");
  var salt = randomSalt_();
  var user = {
    user_id: uuid_(),
    email: email,
    password_hash: hashPassword_(password, salt),
    salt: salt,
    display_name: display_name,
    role: rows_("Users").length === 0 ? "admin" : "user",
    status: "pending",
    failed_logins: 0,
    locked_until: "",
    created_at: nowIso_(),
    last_login: "",
    preferred_provider: "groq",
    preferred_model: "llama-3.3-70b-versatile",
    detail_level: "detailed",
  };
  var code = sixDigitCode_();
  withLock_(function () {
    appendRow_("Users", user);
    appendRow_("EmailCodes", {
      code_id: uuid_(),
      user_id: user.user_id,
      email: email,
      code: code,
      purpose: "verify",
      used: false,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  });
  sendMailCode_(email, code, "verify");
  audit_("register", user.user_id, email);
  return ok_({ user: publicUser_(user), hint: "Code envoye par email." });
}

function action_verify_email(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var code = String(body.code || "").trim();
  var list = rows_("EmailCodes");
  var row = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].email === email && String(list[i].code) === code && list[i].purpose === "verify" && !asBool_(list[i].used)) {
      row = list[i];
      break;
    }
  }
  if (!row) return fail_("Code invalide", "VALIDATION");
  if (new Date(row.expires_at).getTime() < Date.now()) return fail_("Code expire", "EXPIRED");
  withLock_(function () {
    var u = findUser_(row.user_id);
    if (u) {
      u.status = "active";
      updateRow_("Users", u._row, u);
    }
    row.used = true;
    updateRow_("EmailCodes", row._row, row);
  });
  audit_("verify_email", row.user_id, email);
  return ok_({ message: "Compte active" });
}

function action_login(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var password = String(body.password || "");
  var user = findUserByEmail_(email);
  if (!user) {
    audit_("login_fail", "", email);
    return fail_("Identifiants incorrects", "AUTH");
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return fail_("Compte temporairement verrouille", "LOCKED");
  }
  if (user.status === "blocked") return fail_("Compte bloque", "BLOCKED");
  if (user.status === "pending") return fail_("Email non verifie", "PENDING");
  if (!verifyPassword_(password, user.salt, user.password_hash)) {
    var max = settingNum_("lock_after_failures", 5);
    var mins = settingNum_("lock_minutes", 15);
    withLock_(function () {
      user.failed_logins = asNum_(user.failed_logins, 0) + 1;
      if (user.failed_logins >= max) {
        user.locked_until = new Date(Date.now() + mins * 60 * 1000).toISOString();
      }
      updateRow_("Users", user._row, user);
    });
    audit_("login_fail", user.user_id, email);
    return fail_("Identifiants incorrects", "AUTH");
  }
  var token = randomToken_();
  var days = settingNum_("session_days", 30);
  var session = {
    session_id: uuid_(),
    user_id: user.user_id,
    token_hash: sha256Hex_(token),
    device: String(body.device || "web").slice(0, 80),
    created_at: nowIso_(),
    expires_at: new Date(Date.now() + days * 86400 * 1000).toISOString(),
    revoked: false,
  };
  withLock_(function () {
    user.failed_logins = 0;
    user.locked_until = "";
    user.last_login = nowIso_();
    updateRow_("Users", user._row, user);
    appendRow_("Sessions", session);
  });
  audit_("login", user.user_id, session.device);
  return ok_({ token: token, user: publicUser_(user), expires_at: session.expires_at });
}

function action_me(body) {
  var auth = requireAuth_(body);
  return ok_({ user: publicUser_(auth.user) });
}

function action_logout(body) {
  var auth = requireAuth_(body);
  withLock_(function () {
    auth.session.revoked = true;
    updateRow_("Sessions", auth.session._row, auth.session);
  });
  audit_("logout", auth.user.user_id, "");
  return ok_({ message: "Deconnecte" });
}

function action_logout_all(body) {
  var auth = requireAuth_(body);
  withLock_(function () {
    rows_("Sessions").forEach(function (s) {
      if (s.user_id === auth.user.user_id) {
        s.revoked = true;
        updateRow_("Sessions", s._row, s);
      }
    });
  });
  audit_("logout_all", auth.user.user_id, "");
  return ok_({ message: "Tous les appareils deconnectes" });
}

function action_forgot_password(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var user = findUserByEmail_(email);
  if (!user) return ok_({ message: "Si le compte existe, un code a ete envoye" });
  var code = sixDigitCode_();
  withLock_(function () {
    appendRow_("EmailCodes", {
      code_id: uuid_(),
      user_id: user.user_id,
      email: email,
      code: code,
      purpose: "reset",
      used: false,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  });
  sendMailCode_(email, code, "reset");
  audit_("forgot_password", user.user_id, email);
  return ok_({ message: "Code envoye par email." });
}

function action_reset_password(body) {
  var email = String(body.email || "").trim().toLowerCase();
  var code = String(body.code || "").trim();
  // Le client historique utilise new_password ; accepter aussi password pour compatibilité.
  var password = String(body.new_password || body.password || "");
  if (password.length < 8) return fail_("Mot de passe trop court", "VALIDATION");
  var list = rows_("EmailCodes");
  var row = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].email === email && String(list[i].code) === code && list[i].purpose === "reset" && !asBool_(list[i].used)) {
      row = list[i];
      break;
    }
  }
  if (!row) return fail_("Code invalide", "VALIDATION");
  if (new Date(row.expires_at).getTime() < Date.now()) return fail_("Code expire", "EXPIRED");
  var salt = randomSalt_();
  withLock_(function () {
    var u = findUser_(row.user_id);
    u.salt = salt;
    u.password_hash = hashPassword_(password, salt);
    u.failed_logins = 0;
    u.locked_until = "";
    updateRow_("Users", u._row, u);
    row.used = true;
    updateRow_("EmailCodes", row._row, row);
    rows_("Sessions").forEach(function (s) {
      if (s.user_id === u.user_id) {
        s.revoked = true;
        updateRow_("Sessions", s._row, s);
      }
    });
  });
  audit_("reset_password", row.user_id, email);
  return ok_({ message: "Mot de passe mis a jour" });
}

function action_update_profile(body) {
  var auth = requireAuth_(body);
  withLock_(function () {
    var u = findUser_(auth.user.user_id);
    if (body.display_name) u.display_name = String(body.display_name).slice(0, 80);
    if (body.preferred_provider) u.preferred_provider = String(body.preferred_provider);
    if (body.preferred_model) u.preferred_model = String(body.preferred_model);
    if (body.detail_level) u.detail_level = String(body.detail_level);
    updateRow_("Users", u._row, u);
  });
  return ok_({ user: publicUser_(findUser_(auth.user.user_id)) });
}

function action_sessions(body) {
  var auth = requireAuth_(body);
  var hash = sha256Hex_(body.token);
  var list = rows_("Sessions")
    .filter(function (s) { return s.user_id === auth.user.user_id; })
    .map(function (s) {
      return {
        session_id: s.session_id,
        device: s.device,
        created_at: s.created_at,
        expires_at: s.expires_at,
        revoked: asBool_(s.revoked),
        current: s.token_hash === hash,
      };
    });
  return ok_({ sessions: list });
}

function action_delete_account(body) {
  var auth = requireAuth_(body);
  withLock_(function () {
    var ids = {};
    rows_("Conversations").forEach(function (c) {
      if (c.user_id === auth.user.user_id) ids[c.conv_id] = true;
    });
    deleteRowsWhere_("Messages", function (m) { return !!ids[m.conv_id]; });
    deleteRowsWhere_("Messages_archive", function (m) { return !!ids[m.conv_id]; });
    ["UserPreferences", "UserMemories", "CinemaItems", "ConversationPins", "Downloads"].forEach(function (name) {
      deleteRowsWhere_(name, function (row) { return row.user_id === auth.user.user_id; });
    });
    deleteRowsWhere_("Conversations", function (c) { return c.user_id === auth.user.user_id; });
    deleteRowsWhere_("Sessions", function (s) { return s.user_id === auth.user.user_id; });
    deleteRowsWhere_("Users", function (u) { return u.user_id === auth.user.user_id; });
  });
  audit_("delete_account", auth.user.user_id, auth.user.email);
  return ok_({ message: "Compte supprime" });
}
