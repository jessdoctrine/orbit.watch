# Global Patterns — Cloudflare Collector

This is an **optional deployment**, separate from the Orbit Watch Vite/Cloudflare Pages frontend.

The Worker runs every 15 minutes on a Cloudflare Cron Trigger. It queries five city-centered public ADS-B regions, stores **aggregate aircraft counts only** in D1, and exposes a read-only history endpoint. No passenger identities, aircraft registration IDs, or individual movements are persisted.

## Setup (PowerShell, from the project root)

Cloudflare account authorization is required. Never share account IDs, API tokens, or login codes in chat.

1. Confirm you can run `npx.cmd wrangler --version`. If prompted to install Wrangler, approve it.
2. Run `npx.cmd wrangler login` and finish the Cloudflare login in your browser.
3. Run `npx.cmd wrangler d1 create edgecase-exodus-patterns`.
4. Copy the returned **database_id** into `cloud-collector/wrangler.jsonc` in place of `REPLACE_WITH_D1_DATABASE_ID`.
5. Run `npx.cmd wrangler d1 migrations apply edgecase-exodus-patterns --remote --config cloud-collector/wrangler.jsonc`.
6. Run `npx.cmd wrangler deploy --config cloud-collector/wrangler.jsonc`.
7. Verify `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/health`. Then test `/history?region=nyc`. It will remain empty until cron runs.
8. Set a Cloudflare Pages production environment variable called `EXODUS_COLLECTOR_URL` to the Worker origin, e.g. `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev`. Redeploy Pages once the Exodus branch is approved for publication.

**For local Vite development**, create `.env.local` at the project root with:
`EXODUS_COLLECTOR_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev`.
The Vite development proxy will forward `/api/pattern-history/nyc` to your Worker. Restart `npm.cmd run dev` after changing that variable.

The existing local in-browser 15-minute snapshots remain available when the cloud collector is unconfigured. Nothing starts collecting in the cloud until you deploy the Worker and initialize D1.

**Important:** adsb.lol requests production users to contact the provider, and the data is ODbL-licensed. Confirm terms, attribution, rate limits, and any applicable share-alike obligations before publishing this as a production monitoring service. Five API requests per fifteen-minute cron run are configured.

A count surge is not a confirmed departure surge, evacuation, or disaster warning. Receiver outages and incomplete type data can change counts.
