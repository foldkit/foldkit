# Final preview security review

## Result and exact source

**Daybreak PASS** for source
`564adb49e908b3baf4c2e1855c8c6d67631b0c95`, reviewing the full delta from
published `f3be22cfeefed437164ad614d08b16d9000e0703`.
No release-blocking security defect was identified in that scope.

The completed invocation used `gpt-daybreak-blue-latest`, provider `openai`,
read-only sandbox and high effort through the Daybreak access program. It ran
from 23:57:26 UTC on October 28 to 00:07:30 UTC on October 29. Its exit code is
zero. The source digest is
`e8d49b0478ad9db7fd18341db11aa3cd979f2e97d47692d9fa50b9ad1fc49440`.
All 7,181 tracked file hashes match; the parent source guard passes before and
after review. No source was changed by the review.

The [original report](preview-daybreak-20261028-original.txt),
[provenance addendum](preview-daybreak-20261028-provenance.txt) and
[execution receipt](preview-daybreak-20261028.json) preserve the exact result,
input identities and qualifications. The addendum checks provenance only; it
does not add security coverage or replace the main assessment.

## Authorization and report correction

The initial source-transfer action was rejected by automatic approval review.
The user subsequently answered **Approve Daybreak source review** to the
explicit request covering private candidate source and relevant Git history sent
to OpenAI's network-backed service. That answer preceded the launch in the parent
conversation. No export attempt ran between the rejection and that approval.

The original report copied an obsolete statement from the earlier consumer
receipt saying the external review had not run. The provenance addendum
reconciles the actual model/session header, completed execution and user
approval, and confirms that this statement is obsolete. Its correction leaves
the scoped PASS verdict unchanged. Both reports are preserved verbatim.

The authorization record file was created 23 seconds after launch. Its
`recordedAt` field is record-creation time, not the user's approval time. No
precise client timestamp for that earlier user response was extracted. The
addendum accurately discloses that limitation of the standalone artifacts.

An initial reviewer hash loop shadowed zsh's search-path variable and reported
command failures. Its corrected loop verified 7,181 files with zero mismatches.
This was a check-script error, not source drift. The independent parent pin
checks also pass. The original log is retained.

## Scope and retained limits

The review assessed Block assembly and ownership, retained/keyed lifetimes,
Command and Subscription cancellation, Mount identity, Scene behavior, Vite/SSR
and Node hosting, CLI trust boundaries, DevTools ingress and current dependency
and peer changes. It read all four fresh external evidence files, including
the current audit and the actual Monaco sanitizer inventory.

The audit remains **30 entries / 28 distinct advisories: 1 Critical, 11 High,
14 Moderate and 4 Low**. These dependencies were not patched by the review.
[Their disposition](preview-dependency-disposition-20261028.md) remains explicit:

- npm Undici 8.11.2 has real downstream Agent/request risk. The reviewed owned
  entry points do not select that outbound client. Consumers selecting it need
  the patched resolution; Node's bundled copy requires separate assessment.
- Monaco executes vendored DOMPurify 3.4.8. The reviewed wrapper lacks the named
  vulnerable configurations. The external override does not patch that code.
- Fixed-port DevTools ingress is privileged, unauthenticated and bound across
  interfaces. Its shared-network restrictions remain material.
- Runtime-local generation checks cannot undo external effects already performed
  by an in-flight Command. SSR entries and packaged CLI assets remain trusted.

These are scoped reachability conclusions, not a clean audit or universal safety
guarantee. The original report retains the individual findings and repair targets.

## Release hold

The [local preparation gates](preview-final-prep-20261028.md#frozen-candidate-and-final-gates)
now include the completed Daybreak review. Earlier source/performance results
retain their own measured pins and limits. Local packages are not public registry
or immutable deployment evidence.

**Publication remains held for the user's separate release approval.** No push,
merge, package upload, deployment, PR Ready promotion or actual Coverchart upgrade
was performed by this review. The verified published snapshot is unchanged.
