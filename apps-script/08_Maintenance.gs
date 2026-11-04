function dailyBackup() {
  var ss = ss_();
  var folderId = setting_("backup_folder_id", "");
  var folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    var it = DriveApp.getFoldersByName("Movibot-backups");
    folder = it.hasNext() ? it.next() : DriveApp.createFolder("Movibot-backups");
  }
  var name = "Movibot-" + nowIso_().slice(0, 10);
  ss.copy(name).moveTo(folder);
  audit_("backup", "system", name);
}

function archiveOldMessages() {
  var days = settingNum_("archive_after_days", 90);
  var cutoff = Date.now() - days * 86400 * 1000;
  var moved = 0;
  withLock_(function () {
    var msgs = rows_("Messages");
    for (var i = msgs.length - 1; i >= 0; i--) {
      var t = new Date(msgs[i].created_at).getTime();
      if (isFinite(t) && t < cutoff) {
        appendRow_("Messages_archive", msgs[i]);
        sh_("Messages").deleteRow(msgs[i]._row);
        moved++;
      }
    }
  });
  audit_("archive", "system", "moved " + moved);
}

function resetDailyCounters() {
  withLock_(function () {
    rows_("Providers").forEach(function (k) {
      k.used_today = 0;
      updateRow_("Providers", k._row, k);
    });
  });
}

function action_health() {
  return ok_({ status: "up", time: nowIso_() });
}
