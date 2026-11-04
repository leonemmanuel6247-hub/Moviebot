/**
 * Movibot — backend Google Apps Script
 *
 * 1. Extensions > Apps Script, coller tous les fichiers .gs + appsscript.json
 * 2. Executer setupWorkbook() une fois (autorise Spreadsheet + Drive + Mail)
 * 3. Executer installTriggers() pour sauvegarde / archivage
 * 4. Deploy > New deployment > Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copier l'URL web app dans le frontend (VITE_API_URL)
 *
 * Contrat : POST text/plain { action, token, ... } — requete CORS simple.
 */

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json_({ ok: false, error: "JSON invalide", code: "VALIDATION" });
  }
  var action = String(body.action || "");
  try {
    var result = route_(action, body);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err), code: err.code || "ERROR" });
  }
}

function doGet() {
  return json_({ ok: true, status: "up", time: nowIso_() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  data = data || {};
  data.ok = true;
  return data;
}

function fail_(error, code) {
  return { ok: false, error: error, code: code || "ERROR" };
}

var ACTIONS = {
  health: action_health,
  capabilities: function(body) { requireAuth_(body); return ok_({image_input:true, image_limit_bytes:2000000, image_persistent:false}); },
  register: action_register,
  verify_email: action_verify_email,
  login: action_login,
  me: action_me,
  logout: action_logout,
  logout_all: action_logout_all,
  forgot_password: action_forgot_password,
  reset_password: action_reset_password,
  update_profile: action_update_profile,
  sessions: action_sessions,
  delete_account: action_delete_account,
  // API additionnelle : les actions historiques ci-dessous restent inchangées.
  get_preferences: action_get_preferences,
  save_preferences: action_save_preferences,
  list_memories: action_list_memories,
  add_memory: action_add_memory,
  update_memory: action_update_memory,
  delete_memory: action_delete_memory,
  clear_memories: action_clear_memories,
  list_cinema_items: action_list_cinema_items,
  add_cinema_item: action_add_cinema_item,
  delete_cinema_item: action_delete_cinema_item,
  pin_conversation: action_pin_conversation,
  list_conversations: action_list_conversations,
  create_conversation: action_create_conversation,
  rename_conversation: action_rename_conversation,
  archive_conversation: action_archive_conversation,
  delete_conversation: action_delete_conversation,
  list_messages: action_list_messages,
  send_message: action_send_message,
  set_conversation_options: action_set_conversation_options,
  list_models: action_list_models,
  list_personas: action_list_personas,
  usage_mine: action_usage_mine,
  export_data: action_export_data,
  record_download: action_record_download,
  list_downloads: action_list_downloads,
  admin_users: action_admin_users,
  admin_set_user: action_admin_set_user,
  admin_keys: action_admin_keys,
  admin_add_key: action_admin_add_key,
  admin_update_key: action_admin_update_key,
  admin_test_key: action_admin_test_key,
  admin_personas: action_admin_personas,
  admin_save_persona: action_admin_save_persona,
  admin_activate_persona: action_admin_activate_persona,
  admin_improve_persona: action_admin_improve_persona,
  admin_models: action_admin_models,
  admin_save_model: action_admin_save_model,
  admin_settings: action_admin_settings,
  admin_save_settings: action_admin_save_settings,
  admin_usage: action_admin_usage,
  admin_stats: action_admin_stats,
  diag_provider: action_diag_provider,
};

function route_(action, body) {
  var fn = ACTIONS[action];
  if (!fn) return fail_("Action inconnue", "UNKNOWN");
  return fn(body);
}
