# Website readiness checkpoint

## Result

The complete normal hook for commit
`4ed89f750c75d568d3c8ac4594d4f111e124edc1` passed and pushed. Its Website
suite reported one flaky first attempt in
`accessibility.spec.ts:191`: `/ui/combobox` still had one
`[data-foldkit-build]` marker after the existing 5-second readiness wait. The
failure happened before the table and virtual-list assertions. Playwright's
single retry passed, and the suite finished with 21 passed and 1 flaky.

One bounded follow-up ran the same existing test against a fresh server with
one worker and no retries. It passed in 42.9 seconds; the test body took 16.5
seconds and reached both `/ui/combobox` and `/ui/virtual-list` assertions.
This supports classifying the first result as an unresolved readiness timeout,
not as a demonstrated view-default, accessibility, or keyboard regression. It
does not prove the timeout cannot recur. No timeout, rule, test, or source was
changed.

## Exact focused run

Working directory:

```text
/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103
```

Command:

```text
FOLDKIT_WEBSITE_E2E_PORT=38662 packages/website/node_modules/.bin/playwright test accessibility.spec.ts:191 --config=/private/tmp/foldkit-accessibility-focused.config.ts --workers=1 --retries=0
```

`focused-playwright.config.ts` is the exact retained configuration. It starts
the installed Vite binary directly with `--port 38662 --strictPort`, sets one
worker and zero retries, and uses the existing test and global setup. The
direct binaries avoid changing or bypassing package-manager verification. The
workspace's generated Website inputs already existed from the complete hook;
this focused run did not repeat the package script's `predev` generator.

## Preserved evidence

- `original-full-hook.log.gz` is the exact successful push log, including the
  first readiness failure, passing retry, suite summary and remote update.
- `original-test-results/error-context.md.gz` is the failed first attempt's
  Playwright error context and SSR page snapshot.
- `original-test-results/retry1-trace.zip` is Playwright's retained retry trace.
- `original-test-results/last-run.json` records the suite's final passed state.
- `focused-success.log.gz` is the sole actual focused test execution.
- `wrapper-pnpm-verification-failure.log.gz` is an earlier setup attempt that
  never reached Playwright because offline pnpm identity verification refused
  to launch.

An intervening direct launch was denied before listening by the execution
sandbox (`EPERM` on the optional devtools relay port 9988 and Website port
38662). Its `tee` target was later replaced by the successful run, so no raw
file is claimed; the exact command and observed failure are recorded in
`manifest.json`. It did not start a server, browser, or test and is not counted
as a test run.

After the focused pass, the port check found no listener on 38662, the process
check found no Playwright or test Chromium process (only unrelated Zoom CEF
processes), and `git status --short` was empty. These cleanup observations are
recorded without claiming an unretained raw log.

## Limits

This is one requested no-retry follow-up, not repeated sampling. It does not
measure rendering speed, change the readiness budget, or identify the cause of
the original five-second timeout.
