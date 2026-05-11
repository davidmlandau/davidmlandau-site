# David Landau — Cinematic personal site

Site personnel haut de gamme avec expérience 3D immersive, scroll fluide et trois langues (FR / EN / NL).

## Architecture

```
site/
├── index.html         About me — landing cinématique avec scène Three.js
├── watch.html         Radar Veille — outil RSS, score, synthèse automatique
├── news.html          News — articles, points de vue, réseaux sociaux
├── contact.html       Contact — coordonnées + formulaire prêt HubSpot
├── assets/
│   ├── logo.svg       Logo complet (mark + wordmark)
│   └── logo-mark.svg  Mark seul (favicon, header)
├── css/styles.css     Charte cinématique (sombre / clair / accent #CDE0F2)
├── js/
│   ├── main.js        Lenis smooth scroll, nav, custom cursor, loader
│   ├── animations.js  GSAP ScrollTrigger (entry, parallax, stagger)
│   ├── three-scene.js Scène 3D du hero (Three.js)
│   ├── i18n.js        Trilingue FR/EN/NL
│   └── rss.js         Radar RSS côté visiteur
└── data/
    ├── feeds.json         Configuration des flux par catégorie
    ├── watch-radar.json   Agrégation classée générée automatiquement
    ├── watch-digest.html  Synthèse prête à envoyer / partager
    └── translations.json  Chaînes FR / EN / NL
└── tools/
    ├── build-watch-radar.py   Agrégateur RSS sans dépendance Node/npm
    └── build-watch-radar.mjs  Agrégateur RSS serveur sans dépendance
```

## Stack technique

- **Three.js r160** — scène 3D du hero (icosaèdre cristallin réactif au curseur)
- **GSAP 3.12 + ScrollTrigger** — animations cinématiques
- **Lenis 1.1** — scroll fluide physics-based
- **Manrope + Instrument Serif** — typographie variable (Google Fonts)
- **HTML / CSS / JS pur** — aucun build, déployable n'importe où

Tout est chargé en CDN. Aucune installation requise.

## Internationalisation

Trois langues : Français (par défaut), English, Nederlands. Le sélecteur de langue (header en haut à droite) persiste le choix dans `localStorage`. Tous les textes sont gérés via attributs `data-i18n="key"` et le fichier `data/translations.json` — éditable sans toucher au HTML.

## Tester en local

```bash
cd site
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000
```

Un serveur HTTP est nécessaire (les fetch JSON ne fonctionnent pas en file://).

## Radar Veille automatique

La page `watch.html` peut fonctionner de deux façons :

- **Mode visiteur live** : le navigateur lit les flux via `rss2json`, utile pour une version statique simple si le JSON généré est indisponible.
- **Mode Radar Pro** : le serveur exécute `tools/build-watch-radar.py` ou `tools/build-watch-radar.mjs`, agrège les flux, retire les doublons, score les articles par pertinence et génère `data/watch-radar.json` + `data/watch-digest.html`.

Commande manuelle :

```bash
python3 tools/build-watch-radar.py
# ou, si Node est disponible :
node tools/build-watch-radar.mjs
```

Automatisation conseillée : lancer cette commande chaque matin, ou une fois par semaine pour générer la synthèse. Si `RADAR_WEBHOOK_URL` est défini, le script envoie aussi le digest JSON à un outil externe (newsletter, CRM, Make, Zapier, n8n).

## Personnalisation rapide

| Élément              | Fichier                | Action                                                  |
|----------------------|------------------------|---------------------------------------------------------|
| Photo bio            | `index.html`           | Remplacer `<span>Photo à insérer</span>` par `<img>`    |
| Articles             | `news.html`            | Modifier les 6 cartes `.news-card`                      |
| Réseaux sociaux      | tous fichiers          | Remplacer toutes les occurrences de `REMPLACER`         |
| Téléphone / email    | `contact.html`         | Remplacer `+33 0 00 00 00 00` et `contact@davidlandau.com` |
| Flux RSS             | `data/feeds.json`      | Ajouter / retirer / remplacer les sources               |
| Radar automatique    | `tools/build-watch-radar.mjs` | Agréger, classer, dédoublonner les flux          |
| Textes (3 langues)   | `data/translations.json` | Editer les chaînes par clé                            |
| Couleurs / fonts     | `css/styles.css`       | Variables CSS dans `:root`                              |

## Intégration HubSpot

Voir le commentaire HTML dans `contact.html` au-dessus du `<form>` — deux options documentées :

- **Code embed HubSpot** : remplacer le `<form>` par le snippet fourni dans HubSpot > Marketing > Forms > Embed.
- **HubSpot Forms API** : le formulaire actuel a déjà les `name=""` mappés sur les champs HubSpot par défaut (firstname, lastname, email, phone, company, message). Brancher l'envoi `fetch()` vers `https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}` dans le `<script>` en bas de page.

## Logique d'animation (résumé)

- **Hero entry** — chaque mot du titre monte depuis le bas (`yPercent: 120`) avec un easing `expo.out` (1.4s, stagger 70ms). Eyebrow, sous-titre et meta apparaissent en cascade après 1.1s.
- **Three.js scene** — un icosaèdre 2 unités, vertices déplacés par bruit sinusoïdal, surface flat-shaded en `#CDE0F2`. Wireframe overlay opacity 0.18 pour la note techno. Particules atmosphériques (240 points). Le mesh tourne à 0.0028 rad/frame et suit le curseur via easing 0.06 (effet "physics" sans bibliothèque physique).
- **Section reveals** — chaque h2, eyebrow, lede et carte est animé via ScrollTrigger : `start: 'top 82%'`, opacity 0→1, y 60→0, duration 1.1s, easing `expo.out`.
- **Parallax** — visuel manifesto et photo about glissent de y +60→-60 pendant que la section traverse le viewport (`scrub: 0.6`).
- **Hero scroll-out** — quand l'utilisateur quitte le hero, le contenu fond progressivement (opacity 1→0.05, y 0→-80) jusqu'au bas de la viewport.
- **Custom cursor** — point 12px qui suit la souris avec lerp 0.18, s'agrandit à 48px sur les liens, mix-blend-mode `difference` pour rester visible sur fond clair et sombre.

## Performance

- Loader pendant `window.load`, hide après 600ms — masque les flashs FOUC.
- `requestAnimationFrame` partout (Three.js, cursor, Lenis), pas de `setInterval`.
- Scène 3D désactivée si `prefers-reduced-motion: reduce` (et toutes les animations CSS aussi).
- DevicePixelRatio plafonné à 2 pour éviter les charges GPU sur écrans Retina.
- Animation paused quand l'onglet est en arrière-plan (`visibilitychange`).
- Police Google Fonts en `display=swap`, pas de blocage de rendu.

## Déploiement recommandé

Déploiement conseillé : **GitHub privé + Cloudflare Pages + Cloudflare DNS**.

Dans Cloudflare Pages :

- **Repository** : `davidmlandau/davidmlandau-site`
- **Framework preset** : None / Static HTML
- **Build command** : vide
- **Build output directory** : `/`
- **Production branch** : `main`

Le fichier `_headers` applique les headers de sécurité au déploiement Cloudflare : HTTPS renforcé, anti-iframe, limitation des permissions navigateur et politique de contenu.

Le dossier `exports/` est ignoré par Git : il contient les PDF générés localement et ne doit pas être publié par défaut.
