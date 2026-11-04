# Mise à jour Apps Script — Movibot

## Fichiers à remplacer dans le projet lié au classeur

- `00_Config.gs` : feuilles supplémentaires, persona de repli.
- `02_Sheets.gs` : nom de la persona lors d'une initialisation d'un classeur vide.
- `03_Adapters.gs` : outil d'ajout de souvenir pour les modèles compatibles OpenAI.
- `05_Auth.gs` : nettoyage des nouvelles données lors d'une suppression de compte.
- `06_Chat.gs` : épingles, suppression des archives et injection du contexte personnalisé.
- `90_Diagnostic.gs` : les nouvelles actions d'écriture ne sont pas exécutées par le diagnostic automatique.
- `Code.gs` : nouvelles actions API, anciennes actions conservées.
- Ajouter `09_Personalization.gs` (nouveau fichier).

Tous les autres fichiers de ce dossier sont ceux de l'archive originale ; les conserver en place. Les quatre nouvelles feuilles ont été ajoutées au classeur existant : `UserPreferences`, `UserMemories`, `CinemaItems`, `ConversationPins`. Le prompt figure dans `Personas` ; aucun script n'écrase une persona existante au lancement.

## Procédure

1. Retirer le partage public du classeur, révoquer les clés exposées et conserver une sauvegarde privée du classeur et du projet Apps Script.
2. Dans Extensions > Apps Script, sauvegarder une version de l'ancien code. Remplacer le contenu des fichiers listés, puis créer `09_Personalization.gs` et y coller son contenu. Ne pas importer les fichiers Markdown comme code.
3. Lancer `setupWorkbook()` une fois depuis l'éditeur et accepter les autorisations demandées. Il crée les feuilles absentes et ne modifie pas les données d'une feuille existante. Vérifier que les en-têtes des nouvelles feuilles correspondent à `00_Config.gs` ; cette fonction ne migre pas les colonnes existantes.
4. Exécuter `diagnosticComplet()` et consulter `DiagnosticLog`. Ne pas lancer `diagnosticToutesActions()` sur des données réelles : malgré ses exclusions historiques, il peut créer des comptes et conversations, modifier un profil ou appeler l'IA. Ne pas relancer `installTriggers()` si les déclencheurs existants fonctionnent : il supprime tous les déclencheurs du projet avant de les recréer.
5. Déployer > Gérer les déploiements > modifier > Nouvelle version. Conserver l'URL si possible. Sinon, actualiser `expo.extra.apiUrl` dans `app.json` de l'application et reconstruire le client.
6. Sur une copie privée et deux comptes de test, vérifier d'abord : connexion, chat, historique, renommage, suppression, isolation des comptes, mémoire activée/désactivée, outil compatible et épingles. Contrôler aussi le basculement entre fournisseurs.

## Nouvelles actions

Toutes reçoivent le jeton de session `token`, l'identité est déduite du serveur.

- `get_preferences`, `save_preferences` : `instructions`, `memory_enabled` (booléen), `language` (`fr` ou `en`), `theme` (`light`, `dark`, `auto`). La prise en charge effective dans l'interface reste à développer.
- `list_memories`, `add_memory` (`content`), `update_memory` (`memory_id`, `content`), `delete_memory` (`memory_id`), `clear_memories` ; l'ajout exige que la mémoire soit activée. La désactivation n'efface pas les souvenirs.
- `list_cinema_items`, `add_cinema_item` (`title`, `category`), `delete_cinema_item` (`item_id`) : simples fiches, sans téléchargement ni lecteur.
- `pin_conversation` (`conv_id`, `pinned` booléen) ; `list_conversations` renvoie désormais `pinned`. `rename_conversation` est conservée.

L'outil `memoriser_preference` n'est proposé qu'aux fournisseurs utilisant le format OpenAI compatible, lorsque la mémoire est activée et que le dernier message contient une demande explicite de mémorisation reconnue. Il ne stocke qu'un extrait exact de ce message, au maximum 160 caractères. Un filtrage élémentaire tente d'exclure certaines données sensibles mais n'est pas une garantie. Les API Gemini natives, Cohere et les modèles sans function calling ne disposent pas de l'outil. L'agent n'a pas d'outil de suppression/modification : utiliser les actions API. Les instructions et souvenirs sont inclus dans le contexte de l'agent après activation, comme données utilisateur ; ils restent susceptibles d'injection de prompt.

## Limites avant redéploiement

- L'interface actuelle n'est pas raccordée aux nouvelles actions : les préférences, souvenirs, épingles, titres locaux et fiches cinéma qu'elle sauvegarde restent locaux et ne sont pas migrés. Il faut ensuite intégrer ces actions au client.
- Les scripts ont été vérifiés localement avec des mocks ; ils n'ont pas été déployés ni testés avec les véritables fournisseurs.
- Le code existant enregistre le message utilisateur avant la réponse IA ; un échec peut laisser ce message en base. Des audits de sécurité, de concurrence et d'idempotence sont nécessaires avant la production. Les sauvegardes Drive, journaux et copies éventuelles ne sont pas effacés lors de la suppression d'un compte.
- Une colonne masquée n'est pas une protection : ce classeur contient potentiellement des données utilisateurs et clés API. Le garder privé, faire tourner les clés exposées et examiner la sécurité des comptes et sessions.
