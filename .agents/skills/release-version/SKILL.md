---
name: release-version
description: Prepare and verify a Foldkit repository version release, from candidate triage and Changesets review through merge checks, automated publication, and production verification.
---

# Release a Foldkit version

Use the repository's automated release workflow. Read `.github/workflows/release.yml`
and the website workflows it calls for the current jobs, inputs, and dependencies.
`scripts/coherent-release.mjs` defines package upload, verification, and promotion;
`scripts/finalize-github-release.mjs` creates the matching GitHub artifacts.
Paths in this skill are repository-relative unless linked otherwise.

## Prepare the release scope

Identify the previous published versions, candidate fixes and features, dependency
order, release blockers, and work that can follow later. Explain consumer impact
and readiness when proposing the batch. Use [the contributor review skill](../review-contributor-pr/SKILL.md)
for external contributions, including its full-diff and prose review.

Establish the announcement's version range separately from the package release
range when a post covers more than one release. Use [the release blog skill](../write-release-blog-post/SKILL.md)
for the announcement and verify contributor credits across its full range.

## Audit Version Packages

After the selected source changes reach main, inspect the generated pull request
against that exact main commit. Check the expected package set and versions,
manifest and internal dependency changes, any lockfile changes, consumed
changesets, and generated changelog sections. Preserve migration instructions and
verified contributor credits. An unchanged dependency range or lockfile can be
correct; inspect what the release actually requires.

Preserve the Changesets-owned title and description under `AGENTS.md`. Recheck the
head and base after regeneration so the audit covers the final release contents.

## Follow merge authority and checks

Use merge authorization already established in the conversation. Honor explicit
holds and user-owned merge steps. Release preparation and passing checks do not
remove those holds.

Inspect the pull request's own required checks and status rollup, the workflow
event, and the exact head SHA. A successful `workflow_dispatch` run at that SHA
may not satisfy the pull request's check requirements. Surface pending Actions
approval or other concrete blockers before reporting queue readiness.

Follow the current branch rules and watch the merge-group checks on the proposed
merge commit. Auto-merge requested, queue admission, merge, and publication are
separate states. Report the observed state and record the actual merge commit.
Do not bypass protected checks or infer a failed check from `BLOCKED` alone.

## Monitor automated publication

Follow the release run for the actual merge commit. Stable publication flows
through `stable`, `finalize`, and `deploy-website`: upload and verify packages,
promote and verify the complete `latest` snapshot, create matching Git tags and
GitHub Releases, then deploy the website from the published commit.

Version visibility and `latest` tags can change incrementally during upload and
promotion. Wait for the promotion verification result before declaring the stable
package set complete. Check public artifacts independently after that result.

The canary path runs independently of stable publication. Its website deployment
starts after the package canary succeeds. Report canary status separately from
stable publication and production deployment. Stable production can succeed
while a canary job is active; the overall workflow is complete only when its
remaining jobs finish.

Inspect failed steps, logs, and published state before attempting recovery. Do not
cancel active publication or blindly rerun a publishing job. The release workflow's
`workflow_dispatch` input is for finalizing an already-promoted stable commit and
its website deployment. Verify the complete promoted package set and a full commit
SHA on main before using that recovery path. Preserve the user's authorization
boundaries for any recovery action.

## Verify the public release

Compare the expected release contents with the public artifacts:

- Every expected npm package version is present and its `latest` tag is correct.
- Published dependency and peer ranges match the release manifests.
- Git tags and public, final GitHub Releases target the published commit.
- Public release notes preserve the generated changes, migrations, and credits.
- The production website serves the published build and its deployed checks pass.

When a blog ships, verify the public post, approved cover, metadata, release and
guide links, blog index, and feed. Check the served asset against the supplied
cover when the user provided one. A local preview does not establish production
availability.

Report what is published, what verification passed, and any remaining active job
or failure. Link the public release notes and announcement when they are ready.
