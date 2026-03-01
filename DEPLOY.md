# Deploy the updated Task Manager (mobile Add button)

The production build is in the **`dist`** folder. It includes the new Add button and tap-friendly task creator for mobile Safari.

## Render (Node server that serves the React app)

The app uses a **Node server** that serves the built frontend from **`dist`**. The build step must run **from the repo root** so that `npm run build` (Vite) creates `dist/` before the server starts.

1. **Use the included `render.yaml`**  
   Commit and push it so Render uses:
   - **Build command:** `npm run build:render`  
     (This runs root `npm install`, then `npm run build` to create `dist/`, then server install + Prisma **migrate deploy**.)
   - **Start command:** `npm start` (runs the server, which serves `../dist`.)
   - The build uses **`prisma migrate deploy`** (not `db push`) so the database is updated only via migrations and existing data is not at risk.

2. **If you configured the service manually (no Blueprint):**  
   In Render Dashboard → your service → **Settings**:
   - **Build Command:** set to `npm run build:render` (not just server-only commands).
   - **Start Command:** `npm start`.

3. **Force a clean deploy:**
   - Push your latest code (including `render.yaml` and all TaskManagerApp changes).
   - In Render: **Manual Deploy** → **Clear build cache & deploy**.
   - Wait for the build to finish. If the build fails, check the logs (e.g. PostCSS/Node version).

4. **"Drop the column context" / "accept-data-loss" error:**  
   The build now uses a dedicated script that runs **only** `prisma migrate deploy` (never `db push`).
   - Ensure you have committed and pushed **all** of: `package.json`, `scripts/render-build.sh`, and `server/prisma/migrations/`.
   - In **Render Dashboard** → your **task-manager** service → **Settings** → **Build Command**: set to **`npm run build:render`**.
   - **Manual Deploy** → **Clear build cache & deploy**.
   - Do **not** use `--accept-data-loss`; that would remove the Office/Personal feature.

5. **Verify:**  
   Open your Render URL on desktop: in **Tasks**, type a task name and confirm you see the **Add task** button and **Type/Status dropdowns**. Then test on your phone.

## Option A: Other hosts that build from repo (e.g. Netlify, Vercel)

1. **Commit and push** your latest code (including the PostCSS fix and any uncommitted changes):
   ```bash
   git add .
   git commit -m "Mobile: Add button and tap-friendly creator; fix PostCSS build"
   git push origin main
   ```
2. In your host dashboard, ensure:
   - **Build command:** `npm run build`
   - **Publish/output directory:** `dist`
3. Trigger a new deploy (or wait for auto-deploy). When it finishes, your production URL will serve the new bundle.

## Option B: Static upload (e.g. S3, FTP, GitHub Pages)

1. Upload the **contents** of the `dist` folder to your site’s web root (not the `dist` folder itself, unless your host is set up to serve from `/dist`).
2. Ensure `index.html` and the `assets/` folder (with the JS and CSS files) are at the root (or the path your host expects for the app).

## After deploying

- Open your **production URL** on your laptop and confirm you see the “Add task” button in Task view after typing a task name.
- On **iPhone Safari**, close the tab, reopen the production URL, and confirm the Add button and Type/Status/Due/POC taps work.
