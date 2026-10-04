---
name: review-contributor-pr
description: Review, discuss, or finish a Foldkit pull request opened by an external contributor. Use for merge-readiness checks, pending review discussions, contributor feedback, PR prioritization, and taking an accepted contribution across the finish line.
---

# Review Contributor PR

Review the contribution at Foldkit's framework quality bar. Separate design decisions that need contributor input from bounded finishing work a maintainer can complete.

## Understand the contribution

Inspect the pull request, linked issue, full diff against its base, commits, reviews, pending comments, checks, and relevant surrounding code. Explain in plain language:

- What changes for a Foldkit consumer.
- Whether the behavior belongs in Foldkit.
- The main benefit, tradeoffs, and compatibility risk.
- Whether the pull request is a draft, needs contributor feedback, or is ready for maintainer finishing work.

When choosing among pull requests, prefer the oldest non-draft contribution by default. Override that order for dependencies, regressions, or substantially higher framework value.

## Review the full change

Start with architecture and correctness. Then audit the entire diff for API design, state modeling, naming, factoring, Effect and Foldkit conventions, tests, comments, prose, changesets, documentation, examples, and public metadata.

- Search for the whole defect class after finding one instance.
- Read test names, fixture names, comments, TSDoc, changeset text, and user-facing copy as prose.
- Apply the repository conventions relevant to the changed subsystem. Do not turn concerns from an unrelated component into review requirements.
- Put tests in the suite owned by the behavior or abstraction under test.
- For UI changes, inspect both the website and UI showcase when they expose the component. Exercise the browser behavior changed by the diff, including opt-out or disabled behavior and representative dynamic states when relevant.

Do not expand a focused contribution into a repository-wide migration or a new testing framework. Open a follow-up issue for worthwhile adjacent work.

## Decide between feedback and finishing

Leave contributor feedback when the design is unresolved, the intended behavior is unclear, or the remaining work would materially change the contribution. State the important missing pieces first, then perform a targeted second review after they are addressed.

Take the pull request across the finish line when its direction is accepted and the remaining work is bounded cleanup, tests, documentation, rebasing, or pull request metadata. Do not make the contributor wait through another review cycle for changes a maintainer can finish safely.

If the user says pending review comments are for discussion, discuss them before editing. Use a comment-only GitHub review unless the user explicitly asks to approve or request changes. When the user will post comments, provide links to the exact current diff lines and drafts in their voice.

## Finish the branch

Use an isolated checkout when the current workspace belongs to different work. Preserve the contributor's commits and prefer separate maintainer cleanup commits. Rewrite contributor commits or force-push only when rebasing or another explicit need requires it.

Follow the commit skill for local commits. A request to push with `--no-verify` skips the Git hook, not explicit verification. Keep broad follow-up work out of the branch.

Before declaring the pull request merge-ready:

- Re-read the full diff against the current base.
- Confirm the changeset covers every changed published package and describes the actual consumer impact.
- Run checks proportionate to the change, including visual verification for UI work.
- Rebase when needed and resolve the result against current conventions, not merely for textual compatibility.
- Audit the title as a Conventional Commit subject and the description as the squash commit body.
- Read the remote title, description, and head commit back after updating or pushing.
- Wait for required CI checks to pass.

Do not merge for the user unless they explicitly ask. Report remaining blockers precisely, or say that the pull request is ready to queue when none remain.
