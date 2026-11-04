# Correction des appels d’outils JSON

Le prompt actif dans `Personas!D2` a été modifié directement. La partie JSON n’est activée que lorsque le nouveau serveur annonce son protocole ; cela évite de demander du JSON à l’ancien serveur avant sa mise à jour.

## Fichiers à remplacer dans Google Apps Script

Copiez intégralement le contenu de ces fichiers du dossier `Moviebot/apps-script/` dans les fichiers correspondants du projet Apps Script :

- `06_Chat.gs`
- `09_Personalization.gs`

Enregistrez puis faites **Déployer → Gérer les déploiements → Modifier → Nouvelle version → Déployer**. Il n’est pas nécessaire d’exécuter `setupWorkbook` ou `installTriggers`.

Le protocole serveur accepte un objet JSON unique :

`{"tool_call":{"name":"set_memory","arguments":{"key":"user_name","value":"NEMESIS"}}}`

Les clés autorisées sont `user_name` et `preference`. Le texte doit figurer dans un message récent de l’utilisateur, la demande doit être explicite et la mémoire doit être activée. Les appels mal formés, non autorisés ou inconnus ne sont pas exécutés et ne sont pas affichés sous forme de code brut. Les appels natifs déjà pris en charge restent disponibles. D’autres outils pourront être ajoutés explicitement au registre côté serveur.

Après le redéploiement, un test réel sur le compte de test permettra de vérifier le nouveau parseur sur le service actif. Les tests locaux simulent des réponses JSON, XML invalide, outil inconnu, absence de consentement et valeur inventée ; ils ne prouvent pas que le script mis à jour est déjà déployé.
