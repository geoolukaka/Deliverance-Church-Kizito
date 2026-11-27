# Deliverance Church International, Kizito — Website

Static website (HTML + CSS + vanilla JS). No build step.

## Publish on GitHub Pages

1. Create a new repository on GitHub (e.g. `dci-kizito`).
2. Upload **everything in this folder** to the repository root (so `index.html` sits at the top level).
3. Go to **Settings → Pages**, set **Source: Deploy from a branch**, choose **main** and **/ (root)**, then **Save**.
4. After a minute your site is live at `https://<your-username>.github.io/<repo-name>/`.

## Monthly updates (no coding)

Edit `js/content.js` only:

- **Hero slides** (`hero.slides`): headline, text, buttons, photo and optional video per slide. Add or remove slides freely.
- **Photos:** put images in `images/hero/` and set `img: 'images/hero/your-photo.jpg'`.
- **Video:** put a short muted `.mp4` (under ~8 MB) in `videos/` and set `video: 'videos/your-video.mp4'`.
- **Verse of the month** (`themeVerse`), **month / theme badge** (`hero.month`, `hero.theme`), social links, WhatsApp number, groups and the 20 fellowships.

## Files

| File | Purpose |
|---|---|
| `index.html` | All pages (Home, About, Sermons, Events, Give, Contact, Login, etc.) |
| `css/style.css`, `css/extras.css` | Core design system and brand styling |
| `css/animations.css`, `js/animations.js` | Motion layer: logo loader, hero slider, groups carousel, verse flip card, scroll reveals, back-to-top |
| `js/content.js` | **Editable content** |
| `js/script.js`, `js/extras.js` | Routing, forms, giving, groups, cookies |

## Backend (login, M-Pesa giving, forms, newsletters, group updates)

The site works without it, but these features need the Node.js backend (separate zip: `dci-kizito-backend.zip`).
After you deploy the backend, open `js/content.js` and set:

```js
apiBase: 'https://your-backend-domain.com/api',
```

Commit the change and GitHub Pages updates in about a minute. Also set `CORS_ORIGIN` on the backend to your site address
(e.g. `https://<your-username>.github.io`).
