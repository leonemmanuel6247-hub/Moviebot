# Deployer Movibot sur Google Sheets + Apps Script

> Pour mettre à jour le classeur existant, suivre d'abord `LISEZ-MOI-MISE-A-JOUR.md` : ce document historique décrit l'installation initiale et certaines indications ci-dessous ont été mises à jour.

## 1. Creer le classeur

1. Google Drive > Nouveau > Google Sheets, nommer `Movibot`.
2. Extensions > Apps Script.
3. Effacer `Code.gs` par defaut.
4. Recreer les fichiers du dossier `apps-script/` un par un (meme nom, sans le chemin) :
   - `appsscript.json` (Projet > Parametres > afficher le fichier manifeste, coller le contenu)
   - `Code.gs`
   - `00_Config.gs`
   - `01_Crypto.gs`
   - `02_Sheets.gs`
   - `03_Adapters.gs`
   - `04_Context.gs`
   - `05_Auth.gs`
   - `06_Chat.gs`
   - `07_Admin.gs`
   - `08_Maintenance.gs`
   - `09_Personalization.gs`
   - `90_Diagnostic.gs`
5. Enregistrer.

## 2. Initialiser les feuilles

Dans l’editeur Apps Script :

1. Fonction `setupWorkbook` > Executer.
2. Autoriser Spreadsheet, Drive, Mail, UrlFetch.
3. Verifier que le classeur contient : Users, Sessions, Conversations, Messages, Messages_archive, Providers, Models, Personas, Usage, Settings, AuditLog, EmailCodes, Downloads.
4. La colonne `api_key` de Providers est masquee.
5. Fonction `installTriggers` > Executer (sauvegarde 3h, archivage 4h, reset compteurs 0h).

Le classeur reste **prive**. Seul le compte proprietaire du script y accede.

## 3. Publier la web app

Deploy > New deployment > Type : Web app

- Description : `movibot-api`
- Execute as : **Me**
- Who has access : **Anyone**

Copier l’URL (`https://script.google.com/macros/s/.../exec`).

Chaque modification de code : Deploy > Manage deployments > crayon > New version.

## 4. Brancher le frontend

Dans le projet Expo, renseigner `expo.extra.apiUrl` dans `app.json` avec l'URL du déploiement Apps Script. Redémarrer le serveur et reconstruire les applications natives si nécessaire.

Le client envoie deja `Content-Type: text/plain` (requete CORS simple, sans preflight).

Puis reconstruire / relancer le frontend.

## 5. Premier compte

Inscription depuis l’app. Le premier utilisateur devient **admin**.
Le code à 6 chiffres est envoyé par email (MailApp) ; il n'est pas renvoyé dans la réponse JSON.

Ajouter ensuite les cles API dans Administration > Cles API. Elles ne quittent jamais le Sheet.

## 6. Ajouter une cle Groq (exemple)

Administration > Cles API :

- provider : `groq`
- api_key : ta cle
- base_url : laisser vide (defaut `https://api.groq.com/openai/v1`)
- Tester

Rotation automatique : 429 → cooldown, 401/403 → disabled, puis bascule vers `fallback_provider` (Settings).

## Contrat d’API

`POST` body JSON (envoye en `text/plain`) :

```
{ "action": "login", "email": "...", "password": "..." }
```

Reponse :

```
{ "ok": true, ... }   ou   { "ok": false, "error": "...", "code": "AUTH" }
```

Le jeton de session voyage dans le **corps** (`token`), jamais dans un en-tete (Apps Script ne lit pas les en-tetes custom).
