# Build and deploy

Run commands from the repository root. For dependency versions and framework-specific configuration, see [Framework preview notes](framework-preview.md).

```sh
pnpm build
pnpm preview --port 5196
```

The Vite plugin builds the browser and server bundles and prerenders `/` in one command. `dist/client` contains the HTML and assets; `dist/server/fetch.js` exports the Fetch handler for request-time rendering and RPC. Alchemy deploys them together. A query such as `/?q=acme` is restored before the main bundle executes.

Development HTML links the stylesheet directly so the page is styled before client JavaScript runs. Production HTML uses the generated stylesheet manifest.

`pnpm preview` runs the built Fetch handler and assets in local workerd, including the sample-domain RPC backend. A static file server can display the page but cannot answer searches.

Build and deploy the HTML and assets together. Foldkit assigns a coordinated build id so an old document cannot hydrate with an unrelated client bundle. Let the plugin generate the id when one `pnpm build` produces both artifacts.

## Cloudflare through Alchemy

The `preview` stage serves the app at [domains.foldkit.dev](https://domains.foldkit.dev). Alchemy manages the custom hostname on the Website Worker in the Cloudflare account that owns the `foldkit.dev` zone. Other stages do not claim this hostname.

[`infra/alchemy.run.ts`](../infra/alchemy.run.ts) declares the site with [Alchemy’s Foldkit integration](https://alchemy.run/cloudflare/frontend/foldkit/) and Cloudflare-backed state. Alchemy builds the app with its existing Vite configuration and deploys the generated Fetch handler and static assets together. Prerendered `/` is served as an asset; domain API requests reach the Effect backend, and unknown page paths return HTTP 404.

Connect a Cloudflare account through Alchemy’s profile command, then preview and deploy the `preview` stage:

```sh
pnpm --dir infra exec alchemy profile edit --profile default --add Cloudflare
pnpm run plan --stage preview
pnpm run deploy --stage preview
```

The deploy command reports the public URL. Cloudflare deployment credentials belong in the local Alchemy profile or deployment environment, and generated infrastructure output is gitignored. `pnpm dev:cloudflare` runs Alchemy’s native Foldkit development host on port 5195. Both development and production use the same sample-domain RPC handlers.

The local Workers check builds the application and runs the production browser regressions against workerd, including HTTP 404 recovery. `wrangler.jsonc` configures this local check; the Alchemy Stack owns deployment. The deployed suite checks browser behavior and the real RPC endpoint, including concurrent searches. Set `DOMAINS_BASE_URL` to the deployment to test:

```sh
pnpm test:e2e:worker
DOMAINS_BASE_URL=https://domains.foldkit.dev pnpm test:e2e:preview
```

Input readiness does not wait for a lookup. Uncached first-range requests use a 150 ms debounce; progressive ranges bypass it. The browser loads sample data asynchronously through RPC.

## Social sharing assets

The server-rendered HTML includes Open Graph and large-image card metadata for
`https://domains.foldkit.dev`. Search URLs share the app’s canonical homepage
and branded card. The 1200 × 630 sharing image lives at `public/og/domains.png`.

Edit `assets/social-card.svg` or `public/favicon.svg`, then run
`pnpm generate:social` to regenerate the PNG sharing image, favicon, and Apple
touch icon. Commit the generated assets alongside their sources. Page metadata
lives in `src/client/site.ts` and `src/client/documentHead.ts`.
