# Uber Rides (On the road + Earnings Planner + Earnings Estimater)

React + TypeScript app (Vite) with TailwindCSS. Ready for GitHub Pages deployment via Actions.

## Local dev
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
1. Create a new repo on GitHub (e.g. `uber-rides`) and set **Default branch** to `main`.
2. Upload all files from this folder to the repo root and commit.
3. Go to **Settings → Pages**, set **Build and deployment** → **Source** to **GitHub Actions**.
4. The workflow at `.github/workflows/deploy.yml` will build and publish on push to `main`. You can also **Run workflow** from the **Actions** tab.

### Notes
- `vite.config.ts` uses `base: './'` so the app works under a repo subpath (e.g. `/repo-name/`). If you host at `username.github.io`, you can change `base` to `'/'`.
- TailwindCSS is already wired through `src/index.css` and `tailwind.config.js`.
