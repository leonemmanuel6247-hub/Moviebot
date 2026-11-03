# Moviebot — Movibot (React Native / Expo)

Application mobile de chat avec une IA (Movibot), développée avec **React Native 0.88** et
**Expo SDK 58** (Expo Router, TypeScript). Le projet est en *Continuous Native Generation* :
les dossiers `android/` et `ios/` ne sont **pas** versionnés, ils sont générés automatiquement
par `expo prebuild` (en local et dans la CI).

## ✨ Fonctionnalités visibles dans le code

- Authentification par token stocké de façon sécurisée (`expo-secure-store` sur mobile,
  `localStorage` sur le web) — `src/lib/auth.tsx`, `src/lib/api.ts`
- Navigation par fichiers avec Expo Router (`src/app/`)
- Thème clair / sombre / auto avec palettes complètes (`src/theme/index.ts`, `src/lib/theme-context.tsx`)
- Rendu Markdown enrichi des réponses de l'IA (`react-native-markdown-display`)
- Bulles de message, indicateur « réflexion », animations (`react-native-reanimated`)
- Internationalisation légère (`src/lib/i18n.ts`)

## 📁 Structure

```
src/
  app/           # routes Expo Router (index, chat/[id], chat-list, settings)
  components/    # Button, MessageBubble, ConversationMenu, MarkdownView, ThinkingBrain
  lib/           # api, auth, i18n, theme-context
  theme/         # palettes light / dark
assets/          # icônes, splash, favicon
.github/workflows/android-apk.yml   # compilation de l'APK sur GitHub Actions
```

## 🚀 Développement

```bash
npm install          # ou npm ci
npx expo start       # démarre le serveur de dev (Expo Go / dev build)
npm run lint         # ESLint
npx tsc --noEmit     # vérification TypeScript
```

## 📦 Compiler l'APK (GitHub Actions, sans compte EAS)

Le workflow `.github/workflows/android-apk.yml` :

1. installe Node 22, Java 17 (Temurin) et le SDK Android,
2. exécute `npm ci`,
3. génère le projet natif avec `npx expo prebuild --platform android`,
4. compile avec `./gradlew assembleRelease` (ou `assembleDebug`),
5. publie l'APK dans les **artefacts** du run (`movibot-<version>-release.apk`).

**Comment lancer la compilation :**

- automatiquement à chaque `push` sur `main`,
- ou manuellement : onglet **Actions** → **Build Android APK** → **Run workflow**
  (choix `release` ou `debug`).

**Récupérer l'APK :** ouvrir le run terminé → section **Artifacts** → télécharger `movibot-apk`.

Si un tag est poussé (ex. `git tag v1.0.0 && git push origin v1.0.0`), l'APK est aussi attaché
à la release GitHub correspondante.

L'APK `release` est signé avec la *debug keystore* générée par Expo : il s'installe
normalement sur n'importe quel téléphone Android. Pour publier sur le Play Store, il faudra
créer un vrai keystore et configurer la signature (`android/app/build.gradle` ou EAS Build).

## 📲 Installer l'APK

1. Télécharger l'APK depuis les artefacts du workflow.
2. Sur le téléphone : autoriser l'installation d'applications de sources inconnues.
3. Ouvrir le fichier `movibot-1.0.0-release.apk` et installer.

## 🔐 Sécurité

- L'URL de l'API est configurée dans `app.json` (`expo.extra.apiUrl`).
- Aucun secret ni token n'est stocké dans le dépôt.
- Les tokens d'accès personnels (PAT) GitHub ne doivent jamais être commités : si un token a
  été partagé, **révoquez-le** depuis <https://github.com/settings/tokens>.

## 📄 Licence

Voir `LICENSE`.
