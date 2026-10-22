# Foldkit Website

Foldkit documentation website.

## Browser verification

Run the local browser suite from the repository root with bounded concurrency:

```sh
FOLDKIT_WEBSITE_E2E_WORKERS=1 pnpm --filter website exec playwright test
```

`FOLDKIT_WEBSITE_E2E_WORKERS` optionally sets the local/dev-server suite's worker count. When unset, Playwright uses its default worker count. Live playground checks always use one worker.
