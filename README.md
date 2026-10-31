# PULSE Web

**Presidential Unified Leadership, Statistics, and Evaluation**
*one university. one vision. real-time insights.*

A presidential gateway with a smoothly appearing SKSU seal, passcode access, and an authenticated president dashboard. It reads the PULSE API rather than sample fixtures. SINQ, Oracle, and PAD are registered for later connection; missing records appear as dashes and honest waiting states.

## Local development

Requires Node.js 22 and PHP 8.1 or newer for the separate API.

1. In `../pulse-api`, run `php bin/setup.php` once. Open its ignored `.env` to view or change `PRESIDENT_PASSCODE`. The passcode is the only sign-in credential.
2. Start the API from `../pulse-api`:

   ```powershell
   php -S 127.0.0.1:8000 -t public public/router.php
   ```

3. In this folder:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

4. Open **http://127.0.0.1:5173**. Use this exact origin because the API validates `APP_URL` on sign-in and sign-out. If you use `localhost` or a different port, update API `APP_URL` to match.

`npm.cmd` works in Windows PowerShell even when script execution policy blocks `npm.ps1`. On macOS/Linux, use `npm` normally.

## GitHub and Vercel

Upload **this folder** as the frontend repository. Dependencies and generated files are excluded by `.gitignore`. Commit `package-lock.json`.

Import the repository in Vercel using the Vite preset. `vercel.json` sets `npm run build` and output `dist`, and explicitly rewrites `/api/:path*` to the named `api/proxy.js` function. The proxy forwards the allowlisted authentication and read-only `/v1/` dashboard routes to PHP. It does not expose source synchronization or arbitrary API paths. A bracket-named catch-all file alone does not route these nested URLs with this Vite deployment.

Set these **server-side Vercel environment variables**:

| Variable | Value |
| --- | --- |
| `PULSE_API_ORIGIN` | Your HTTPS PHP API base URL, e.g. `https://api.example.edu.ph` |
| `PULSE_PROXY_SECRET` | Shared secret matching PHP `.env`; use at least 32 characters for the production deployment checks |

On the PHP host set `APP_ENV=production` and `APP_URL` to the exact final frontend origin (e.g. `https://pulse.example.edu.ph`). Then deploy/redeploy Vercel. Each additional preview origin requires its own API configuration; arbitrary preview domains are deliberately rejected.

The passcode belongs only in the API's `.env`. Do not use `VITE_` variables for passcodes or secrets: those are public browser configuration. The proxy keeps the HttpOnly session cookie on the web app's domain, so the API may live on a separate hosting domain without cross-site cookies or browser CORS configuration.

After deployment, request `/api/auth/session` while signed out. It should return the PHP API's JSON `401` response, not Vercel's HTML `404 NOT_FOUND` page. A working PHP `/health` endpoint checks only the backend; it does not check Vercel's proxy routing. If the browser reports a blocked `vercel.live/_next-live/feedback/feedback.js`, that is Vercel Toolbar injection blocked by the portal's script policy and is separate from authentication routing.

## Behavior

- PULSE uses a shared Paola wordmark with a luminous orange **E**. Other letters inherit the surface's foreground color. The login uses the same deep green and faint circular motif as the featured campus card, with readable cream labels above the centered seal. The full label sits closely above the smaller, lowercase italic tagline; there is no separator, page header, or traditional login card. See `public/fonts/PAOLA-NOTICE.md` for the font's source and stated usage terms.
- The intact seal smoothly fades into view. Selecting it gently dims the seal and slides a single passcode field into view beneath it.
- Focus moves to the passcode field, including opening phone keyboards on a tap. The inline arrow or Enter unlocks PULSE; Cancel, Escape, or selecting the seal again closes entry and clears the typed passcode.
- Responsive layout for phones, tablets, laptops, and desktop displays; locally bundled fonts and reduced motion support.
- Passcode visibility toggle, native required-field validation, loading states, incorrect-passcode errors, and service-unavailable messages.
- The passcode is verified by PHP; no username, registration, or password reset form.
- Session restoration on refresh and server-side sign-out.
- Successful authentication opens the president dashboard. University and individual-campus snapshots share four function tabs: **Instruction**, **Research**, **Extension**, and **Production**. Each tab changes the displayed statistics, campus comparison measures, and progress indicator.
- Buildings, classrooms, laboratories, recorded assets, asset value, and budget use appear in a shared **Building inventory & assets** section. The campus filter applies to both the fourfold snapshot and physical resources; campus detail dialogs include the same categories and inventory summary.
- Campus cards use monogram symbols. The directory supports campus-name search and individual detail dialogs.
- The sidebar appears only on wide screens (1280px and above). On smaller screens, a fixed footer provides **Overview**, **Campuses**, **Assets**, **Sources**, and **More**. More opens a bottom sheet with shortcuts to all four university functions, the president profile, and sign-out. It never opens the desktop sidebar. The footer respects the device's safe area, reserves content space, and tracks the visible section.
- The four function tabs support arrow keys, Home, and End. Campus details and the More sheet use native modal focus handling and Escape dismissal. Smaller interface text is enlarged and its contrast strengthened; dark green surfaces use light foregrounds.
- Preview banners, sample statistics, hardcoded academic periods, and demo fixtures are removed. `src/modules/president/data.ts` validates the API response and distinguishes missing metrics (`null`) from confirmed zero. If any selected campus lacks a metric, the corresponding full total remains unavailable. Source timestamps and stale/partial states are shown honestly.
- Loading or refreshing the dashboard only reads PULSE's protected snapshot endpoint. The browser never calls SINQ, Oracle, or PAD directly, and source credentials stay on PHP. Expired sessions return the president to passcode entry; API failures offer a retry.
- Production income is revenue less operating expenses; retention is weighted by enrolled students. Community and beneficiary totals reflect campus record counts unless the source adapter provides deduplicated counts. Financial loss values are supported in the comparison chart.

## Preparing source systems

The API's [integration guide](../pulse-api/docs/integrations.md) and [OpenAPI file](../pulse-api/docs/openapi.yaml) describe the prepared contracts. Confirm actual source routes, credentials, campus mappings, periods and category ownership later; the website addresses alone are not API documentation. No source is automatically enabled and no scheduler has been installed.

Synk faculty profiles are the first read-only detail feed. PULSE syncs a curated profile snapshot from the single Synk PHP endpoint when an operator runs `php bin/sync.php --faculty-profiles`; the president's Faculty profiles view reads the private PULSE snapshot. It never writes to Synk or calls Synk from the browser. The endpoint must first be deployed to Synk, and its cPanel bearer-token environment variable must match `SINQ_API_TOKEN` on the PULSE PHP host.

Before deploying the PHP side, run its production configuration check and set the final hosting origins. Confirm the Paola font's public institutional/web-embedding permission using the included font notice. No GitHub push, Vercel publication or external source connection is performed by local builds.

## Verification

```powershell
npm.cmd run build
npm.cmd test
```

The PHP README documents the API smoke checks and hosting requirements. A Vite static preview serves the page only; use `npm run dev` for local authentication, since the dev server includes the API proxy.
