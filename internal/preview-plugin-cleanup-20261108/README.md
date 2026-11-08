# Vite resolution fixture cleanup

The normal push for evidence commit `c3ffef0ced` stopped before uploading.
One Vite-plugin resolution test failed while removing its temporary
`node_modules` directory with `ENOTEMPTY`; no assertion failure was reported. The remaining
files were Vite optimizer outputs. The Website browser suite was not reached.

The fixture already awaited server shutdown before removing its root. Vite
8.3.5 optimizer cancellation can resolve before its pending filesystem writes
finish. Other server tests use the existing `createServerCache` helper and
retain optimizer caches under a worker-owned root until workers exit.

The resolution fixture now uses that helper with a `node_modules/.vite`
suffix. This separates optimizer-cache lifetime from fixture-root lifetime
and preserves the default optimizer path classification. No plugin behavior,
assertion, timeout or retry policy changes.

## Verification

The complete `resolution.test.ts` file passes all 37 cases with empty stderr.
The recorded before/after temporary-directory inventories contain no new
fixture or shared-cache roots. The final source hash is
`ea2034891735238a8531b9c5241700c697b8ffeaa347a2699921c6db28a0df37`.

A direct external cache path without the `node_modules` segment was rejected:
two tests failed because the view-identity transform branded generated
optimizer files. The final fixture retains the default path classification;
the rejected variant is not presented as passing or adopted. Its source can
be reconstructed from the final source as recorded in the focused receipt.

The [original failed push](measurements/failed-normal-push.json) and
[both focused outcomes](measurements/focused-tests.json) retain the commands,
source hashes, stdout/stderr, exit states and original cleanup inventories.
The earlier one-test success for a temporary retry-based candidate does not
verify this final change. The final commit requires its own exact review and
complete normal push gate.
