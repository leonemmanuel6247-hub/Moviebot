# Schema Google Sheets — Movibot

Premiere ligne = en-tetes, figees. Chaque ligne a un UUID. Ecritures sous `LockService`.

## Users

| Colonne | Contenu |
|---|---|
| user_id | UUID |
| email | unique, minuscule |
| password_hash | SHA-256 itere + sel (jamais en clair) |
| salt | sel aleatoire |
| display_name | nom affiche |
| role | user / admin |
| status | pending / active / blocked |
| failed_logins | compteur |
| locked_until | ISO, vide si libre |
| created_at, last_login | ISO |
| preferred_provider, preferred_model | defauts |
| detail_level | concise / detailed / expert |

## Sessions

session_id, user_id, token_hash (empreinte SHA-256 du jeton, jamais le jeton), device, created_at, expires_at, revoked

## Conversations

conv_id, user_id, title, persona_id, provider, model, summary, summarized_until, created_at, updated_at, archived

## Messages / Messages_archive

msg_id, conv_id, role (user/assistant/system), content, tokens_est, provider, model, created_at

Archivage auto : messages > N jours (Settings.archive_after_days) deplaces vers Messages_archive.

## Providers (cles API)

Feuille **dediee uniquement aux cles**. Une **ligne par cle**, classees par la colonne `provider`
(conforme au cahier des charges : « une ligne par clé » et non une colonne par fournisseur,
pour permettre la rotation). Colonne `api_key` masquee.

key_id, provider (groq/openrouter/nvidia/gemini/sambanova/cohere/huggingface/demo), label, api_key (colonne masquee), base_url, priority, status (active/cooling_down/disabled), cooldown_until, used_today, daily_limit, last_error, last_used

## Models

model_id, provider, display_name, context_max, output_max, supports_vision, supports_streaming, enabled

## Personas

persona_id, name, version, system_prompt, is_active, updated_by, updated_at

Chaque modification cree une nouvelle version. Une seule active.

## Usage

usage_id, user_id, provider, model, tokens_in, tokens_out, duration_ms, success, error, created_at

## Settings

| key | defaut | role |
|---|---|---|
| context_budget | 8000 | plafond tokens envoyes |
| session_days | 30 | duree jeton |
| max_retries | 3 | essais cles |
| fallback_provider | openrouter | bascule auto |
| max_message_chars | 32000 | taille message |
| daily_user_token_limit | 200000 | quota user |
| archive_after_days | 90 | archivage |
| max_download_mb | 100 | telechargements |
| lock_after_failures | 5 | verrouillage login |
| lock_minutes | 15 | duree verrou |
| cooldown_minutes | 10 | pause cle 429 |
| output_reserve | 1500 | reserve reponse |

## AuditLog

log_id, action, user_id, detail (jamais de cle ni mot de passe), created_at

## EmailCodes

code_id, user_id, email, code (6 chiffres), purpose (verify/reset), used, expires_at (15 min)

## Downloads

dl_id, user_id, url, filename, size, status, created_at

## UserPreferences

user_id, instructions, memory_enabled, language, theme, updated_at

## UserMemories

memory_id, user_id, content, created_at, updated_at

## CinemaItems

item_id, user_id, title, category, created_at, updated_at. Il s'agit de fiches, pas de fichiers réellement téléchargés ou de flux vidéo.

## ConversationPins

conv_id, user_id, pinned_at. Une ligne pour chaque discussion épinglée.
