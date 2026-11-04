# Mise à jour — pièces jointes et routage

## À copier dans Google Apps Script

Remplacez intégralement le contenu des fichiers ci-dessous dans le projet Apps Script par celui des fichiers correspondants de `Moviebot/apps-script/` :

1. `03_Adapters.gs`
2. `04_Context.gs`
3. `06_Chat.gs`
4. `Code.gs`

Enregistrez, puis **Déployer → Gérer les déploiements → Modifier → Nouvelle version → Déployer**. Ne lancez pas `setupWorkbook` ou `installTriggers`.

La ligne `Models` de Qwen dans le classeur a déjà été mise à jour : vision activée et fenêtre de contexte numérique. Les autres modèles et clés n’ont pas été effacés.

## Fonctionnement

- Par défaut : Groq `qwen/qwen3.8-27b`, puis autres modèles activés et fournisseurs configurés en cas d’échec. Le routage respecte les clés désactivées et leur temps de refroidissement ; il ne peut pas garantir une disponibilité absolue si tous les services sont indisponibles ou si le quota propre au compte Movibot est atteint.
- Le trombone accepte une image JPG, PNG ou WebP jusqu’à 2 Mo ou un petit fichier texte UTF-8. L’image est transmise au serveur et au fournisseur compatible vision pour la réponse en cours ; elle n’est pas stockée dans l’historique. Le texte est transmis au fournisseur et conservé dans le message. Évitez les informations sensibles.
- Pour les images, le repli est limité aux modèles explicitement pris en charge : actuellement Qwen vision sur Groq. Si aucun modèle vision n’est disponible, une erreur est indiquée plutôt que d’envoyer l’image à un modèle texte. Pour les messages texte, les autres fournisseurs configurés sont utilisés en repli.
- Le client vérifie la capacité image du serveur avant de l’envoyer ; il faut donc déployer les quatre fichiers avant de tester cette fonction.
- Apparence clair/sombre/système, niveau de détail, nom affiché et consommation sont dans les paramètres. Le thème est enregistré sur le compte connecté ; hors connexion, il reste sur l’appareil.

## Vérifications

Les tests locaux couvrent priorité de Qwen, repli simulé, quotas simulés et absence de repli vers un modèle non compatible vision. Le modèle Qwen a aussi répondu à un test texte réel sur le déploiement précédent. L’envoi d’image et le nouveau routage doivent être testés sur le serveur après redéploiement : un test local ne démontre pas leur disponibilité en production.
