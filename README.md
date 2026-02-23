# Quiz Biblique LSG 1910 (Genèse)

Application React + TypeScript + Vite pour quiz biblique en français, basée sur la Louis Segond 1910.

## Installation et exécution

```bash
npm install
npm run dev
```

Build de production:

```bash
npm run build
npm run preview
```

## Protection d'accès (Netlify Identity)

L'application peut forcer la connexion, avec un mode désactivable.

### Activation sur Netlify

1. Ouvrir `Site configuration` > `Identity`.
2. Activer Netlify Identity (`Enable Identity`).
3. Dans `Registration preferences`, choisir `Invite only`.
4. Dans `Site configuration` > `Environment variables`, ajouter:
   - `VITE_REQUIRE_LOGIN=true`
5. Relancer un build/deploy.

Comportement:
- `VITE_REQUIRE_LOGIN=true` + Identity actif: connexion obligatoire.
- Identity inactif: accès libre (pas de blocage).

### Désactiver la protection

Mettre:

```bash
VITE_REQUIRE_LOGIN=false
```

Puis redéployer. L'application redevient accessible sans connexion.

## SEO (SPA React/Vite)

Le projet applique des métadonnées SEO via `react-helmet-async` selon l’écran actif:

- Accueil (`/`)
- Livre logique (`/livre/<slug>/<niveau>`)
- Généralités (`/generalites/<niveau>`)

### Variable d’environnement `SITE_URL`

Définir `SITE_URL` avec l’URL publique de production (exemple Netlify):

```bash
SITE_URL=https://mon-site.netlify.app npm run build
```

Le script `npm run generate:seo` génère automatiquement:

- `public/sitemap.xml`
- `public/robots.txt`

`npm run build` exécute aussi cette génération SEO.

Sur Netlify:

1. Ouvrir `Site settings` > `Environment variables`.
2. Ajouter `SITE_URL` avec l’URL finale du site.
3. Relancer un build.

### Vérifier les métadonnées et le partage

1. Ouvrir l’application puis inspecter la balise `<head>` dans DevTools.
2. Vérifier `title`, `description`, `canonical`, `og:*`, `twitter:*`.
3. Tester le partage Open Graph:
   - Facebook Sharing Debugger (re-scrape)
   - aperçu WhatsApp après publication (lien absolu + `og:image`)

## PWA (installable + hors ligne)

L’application inclut un Service Worker (`vite-plugin-pwa`) pour:

- installation sur mobile/desktop,
- ouverture hors ligne de l’application,
- réutilisation hors ligne des livres/chunks déjà consultés.

### Installation

Android (Chrome):
1. Ouvrir le site.
2. Menu navigateur.
3. Choisir `Installer l’application` ou `Ajouter à l’écran d’accueil`.

iOS (Safari):
1. Ouvrir le site dans Safari.
2. Bouton `Partager`.
3. `Sur l’écran d’accueil`.

Desktop (Chrome/Edge):
1. Ouvrir le site.
2. Cliquer l’icône d’installation dans la barre d’adresse.
3. Valider `Installer`.

### Test hors ligne (recommandé)

1. Build et preview:
   ```bash
   SITE_URL=https://mon-site.netlify.app npm run build
   npm run preview
   ```
2. Ouvrir l’app en ligne.
3. Lancer au moins un quiz d’un livre + une session Généralités (30).
4. Ouvrir DevTools > Network > `Offline`.
5. Recharger:
   - l’application doit s’ouvrir,
   - le livre déjà consulté doit rester jouable,
   - Généralités déjà chargées doivent rester jouables.

### Limites offline

- Un contenu jamais consulté en ligne peut être indisponible hors ligne.
- Dans ce cas, le message affiché est:
  `Contenu non disponible hors ligne. Ouvrez ce livre une fois en ligne pour le mettre en cache.`

## Structure

```text
src/
  components/
    BookList.tsx
    QuizView.tsx
    ResultView.tsx
    ProgressBar.tsx
  data/
    books.json
    questions/
      genese.json
  lib/
    quizEngine.ts
    minQuestions.ts
    storage.ts
  App.tsx
  main.tsx
```

## Règle `minQuestions()`

Fichier: `src/lib/minQuestions.ts`

- Base: `3 × chapitres`
- Palier spécifique chapitres 41 à 50: minimum 80
- Résultat final: `Math.max(base, palier)`

Exemple Genèse (`50` chapitres):
- `3 × 50 = 150`
- palier = `80`
- minimum retenu = `150`

## Banque de questions Genèse

- Fichier: `src/data/questions/genese.json`
- Volume: `150` questions (3 versets par chapitre, chapitres 1 à 50)
- Champs inclus par question:
  - `id`
  - `book`
  - `chapter`
  - `verseRef`
  - `verseText`
  - `question`
  - `choices` (3)
  - `correctIndex`
  - `explanation`

## Génération des lots

Script disponible:

```bash
npm run generate:genese
```

Le script `scripts/generate-genese.mjs`:
- lit la source LSG VPL locale (`/tmp/fraLSG_vpl/fraLSG_vpl.txt`),
- extrait les versets de Genèse,
- génère 150 questions,
- applique des vérifications anti-cohérence (réponse correcte présente dans le verset, distracteurs distincts),
- écrit `src/data/questions/genese.json`.

## Ajouter un nouveau livre

1. Ajouter le livre dans `src/data/books.json`:
   - `id`, `name`, `chaptersCount`, `questionsFile`.
2. Créer `src/data/questions/<livre>.json` avec le même schéma que `genese.json`.
3. Importer ce fichier dans `src/App.tsx`.
4. Étendre la sélection dans `session` (`buildQuizSession`) pour lier `book.id` au bon dataset.
5. Vérifier que le volume respecte `minQuestions(chaptersCount)`.

## Fonctionnalités livrées

- Interface 100% française
- Quiz question par question
- Boutons verrouillés après sélection
- Bonne réponse en vert, mauvaise en rouge
- Bouton “Passer à la question suivante”
- Résultats: bonnes, mauvaises, total, pourcentage coloré
- Mode sombre
- Sauvegarde du meilleur score par livre (`localStorage`)
- Responsive mobile + desktop
