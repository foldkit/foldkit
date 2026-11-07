# Preview publication recovery

The November 7 preview publication stopped before its first upload because an npm metadata request failed. Both attempts of [Release run 42357744047](https://github.com/foldkit/foldkit/actions/runs/42357744047) used reviewed source `52ecdc1050024fb1f5bd526e696d32f9e4c01c6e`. Builds and emitted-declaration checks passed before `registry.version` rejected the first planned package lookup with `fetch failed`.

Independent registry reads after each attempt found all nine target versions absent, no corresponding upload tags, and every stable `latest` tag unchanged. No package was uploaded or deployed from either failed attempt. The registry-state receipts and complete logs remain in the host's release evidence.

## Recovery scope

The registry client retries a metadata GET once when fetch rejects with an `ECONNRESET` or `UND_ERR_SOCKET` cause. Both attempts share the original timeout signal. This is a retry of the read, not publication or tag promotion.

An exhausted socket failure retains its final error cause and reports that cause in the diagnostic. Timeouts, other transport errors, HTTP responses, authentication failures and malformed JSON keep their existing failure behavior. A 404 still means an absent version. Packed-byte integrity and complete-snapshot validation remain required, including when a recovered read finds an existing version.

A local HTTP probe reproduced a pooled-connection reset after synchronous work. The unmodified client rejected the read; with recovery, the same observed reset was followed by a successful read. This is a plausible explanation for the workflow failures, not proof of their underlying cause: their original diagnostics omitted that cause.

Changes are confined to release tooling, its tests and release records. Framework, UI, application and benchmark runtime inputs remain identical to the reviewed candidate, so the existing rendering measurements retain their scope.

## Verification at this checkpoint

- All 50 coherent-release tests pass, including recovery for packument and version reads, exactly two attempts on repeated resets, unchanged HTTP/JSON errors, shared timeout identity, pre-upload exhaustion, existing-byte mismatch rejection, and exactly one publication when a surrounding read is interrupted.
- All 252 script tests and script typechecking pass.
- Ten selected recovery tests fail without the implementation. Removing the abort guard makes the timeout regression fail; the source is restored byte-for-byte afterward.
- The local socket probe succeeds after the fix while still recording the underlying `ECONNRESET` event.
- The repository's configured root lint excludes `scripts/`; no successful scoped lint result is inferred from an ignored-file invocation. JavaScript syntax checks, formatting and the normal push gate remain part of verification.

This checkpoint does not claim publication. The exact commit must pass independent review, the normal push gate, protected integration checks and the authorized Daybreak follow-up. Publication then uses the integrated commit and verifies its registry manifest, an external consumer and the immutable Website deployment before updating the Ready announcement.

## Observed broken-pipe follow-up

[Release run 42363247540](https://github.com/foldkit/foldkit/actions/runs/42363247540) reached the same pre-upload lookup from integrated source `3491c219146efdd0e88655a7a70a0de0805faab8`. The retained cause now identifies `write EPIPE`. The first recovery deliberately accepted only `ECONNRESET` and `UND_ERR_SOCKET`, so it rejected this additional socket failure rather than retrying it or treating it as absence.

The read retry now includes this observed `EPIPE` code. It still permits only one repeat within the same timeout. Publishing, HTTP/404/JSON handling and packed integrity checks are unchanged. Independent registry reads after the failed run again found all nine target versions absent, no upload tags and unchanged stable tags.

Both added EPIPE tests fail against the preceding implementation. With the additional code, all 52 coherent-release tests and 254 script tests pass. This follow-up changes no published package, application or benchmark runtime code. The same independent review, normal push, protected integration, authorized Daybreak and actual-artifact gates apply before publication is reported.
