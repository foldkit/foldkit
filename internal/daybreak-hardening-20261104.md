# Daybreak review and hardening follow-up

The user authorized a read-only Daybreak review of integrated preview
`44e94feeba0e69c2d61657cb4fba32570452cde8` against published preview
`90746b32d2ca8bc0476de7a051ace396ca590ae0`, including small review-driven
follow-up diffs. Publication remains held.

The review completed with no substantiated new security finding or
release-blocking correctness finding. Its frozen 8,687 tracked entries and
literal symlink target remain unchanged. The original report is retained at
`/private/tmp/foldkit-daybreak-44e94feeba0e-20261104/daybreak-report.md`, SHA-256
`00a873c0961160f6ba00b3cc8a7af6c45722430eab7d0e4a5ed46292bf40deab`.
The companion `review-status.json` records authorization, invocation, completion,
hashes and limits. This static review does not establish a fresh dependency
advisory audit; its inherited DevTools and dependency caveats remain visible.

The user requested both non-blocking hardening improvements:

- Registry discovery now applies its existing authenticated loopback URL policy
  before checking process or port liveness. Unsupported records are ignored
  without probing or removing them. The later duplicate filter is removed;
  explicitly configured relay hosts retain their existing path.
- Scaffold guidance, the server-rendering guide and public plugin TSDoc explain
  that `server.hmr: false` leaves `import.meta.hot` unavailable. Server module
  reevaluation cannot call an unregistered disposal callback. Stop and restart
  the dev-server process after editing modules that own long-lived resources;
  an in-process restart does not invoke that callback. Runtime behavior is
  unchanged.

The new portable registry tests force different PID namespaces with one network
namespace. Synthetic sockets observe unsafe probes without making external
connections; a real local listener verifies valid relay probing. Existing
registry fixtures now use the authenticated URL shape emitted by the publisher.
The six invalid-record cases fail before the fix. A disposable copy of the final
tests also fails all six when the early validation is removed, then passes after
restoration. The full DevTools MCP suite passes 108 tests with its original 10
platform skips, and package source/test typechecks pass.

Logs and mutation receipts are retained beside the original report as
`hardening-before.log`, `hardening-focused.log`, `hardening-package-tests.log`,
`hardening-types.log` and `hardening-mutation-receipt.json`. Exact-commit review,
a scoped Daybreak follow-up and required integration checks apply to this change.
The framework renderer is unchanged; its previously recorded performance and
bundle costs remain separate review items.
