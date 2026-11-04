# Mise à jour — mémoire et conversations

Le prompt actif `Personas!D2` a déjà été modifié directement dans le classeur. Le déploiement Apps Script existant n’a pas été modifié par cette opération.

Dans le projet Apps Script associé au classeur, remplacez le contenu des trois fichiers suivants par les versions du dossier `apps-script` :

- `03_Adapters.gs`
- `06_Chat.gs`
- `09_Personalization.gs`

Conservez les autres fichiers et leurs fonctionnalités. Enregistrez, puis mettez à jour le déploiement de l’application Web avec une nouvelle version. Ne lancez ni `setupWorkbook`, ni `installTriggers` pour cette mise à jour.

Après déploiement, vérifiez avec le compte de test : activez la mémoire dans les paramètres ; demandez « Je m’appelle [prénom de test], enregistre mon prénom dans ta mémoire » ; vérifiez le souvenir dans les paramètres ; démarrez une nouvelle discussion et demandez quel prénom a été retenu ; supprimez le souvenir de test et restaurez l’état initial du réglage. Vérifiez aussi le cas où la mémoire est désactivée. Les nouvelles indications d’outil s’affichent à la réception de la réponse mais ne sont pas conservées dans l’historique après rechargement.

Les anciens paramètres et souvenirs locaux de l’appareil ne sont ni effacés ni importés automatiquement. Le filtrage côté serveur tient compte des messages actifs et archivés. Sur un ancien déploiement, le client utilise une vérification de compatibilité qui ne peut pas garantir l’identification de tous les anciens messages archivés.

Les tests locaux du projet simulent la base et ne remplacent pas ce test sur le déploiement mis à jour. Aucun outil cinéma de recherche, lecture, téléchargement ou streaming n’a été ajouté.
