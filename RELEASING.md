# Releasing

Foldkit uploads and promotes a release in separate steps. Uploads use npm
trusted publishing and provenance. Promotion uses an interactive npm session
with 2FA because npm trusted-publishing OIDC does not authorize `npm dist-tag`.

The split prevents `latest` from moving while only part of the public package
set exists. It also keeps a long-lived npm token out of GitHub Actions.

## Stable packages

1. Merge the Version Packages pull request.

2. The Release workflow's stable job discovers every public package from the
   pnpm workspace manifests. It builds and packs every untagged release
   version, then uploads them one at a time under the commit-specific
   non-consumer tag such as `foldkit-stable-upload-0123456789ab`. A rerun skips
   a matching version that npm already has and rejects one whose registry
   integrity differs.

3. Wait for GitHub Actions to mention `@devinjameson` on the merged Version
   Packages pull request. The stable job posts that comment only after it
   fetches the complete public package set from npm and checks each internal
   dependency and peer range against the versions in this release. The comment
   names the exact release commit and gives the local promotion commands. A
   rerun updates the existing comment instead of posting another notification.

   The last upload is not enough. Changesets only creates the Version Packages
   pull request. The coherent uploader runs in a separate workflow step, so its
   output cannot be mistaken for Changesets' tag-push protocol.

4. Follow the commands in the notification from a clean local checkout. Confirm
   that `npm whoami` and `gh auth status` both succeed, then sign in to npm with
   2FA. The notification fetches `main`, checks out the exact release commit,
   and installs its locked dependencies before running:

   ```sh
   pnpm release:promote
   ```

   The command prompts once for an npm one-time password and reuses it for the
   package tag changes. The password is not echoed or included in command-line
   arguments. Set `NPM_CONFIG_OTP` before running the command when another
   secure prompt already supplies it. The promoter removes that value from the
   environment of its pnpm, Git, and GitHub subprocesses.

   Before changing an npm tag, the promoter refreshes `origin/main`. It checks
   that the clean checkout is an ancestor of current `main` and derives at
   least one versioned public package, including its changelog section, from
   that exact commit. A later website commit or an unpublished local commit
   therefore stops before npm changes.

   Promotion repeats the complete registry check and reads every current
   `latest` manifest before moving any tag. It computes a promotion path where
   every intermediate mixture of old and new tags satisfies all internal
   dependency and peer ranges. It prefers `create-foldkit-app` first because
   that self-contained CLI already uses the exact uploaded versions. If no safe
   path exists, the command stops without changing a tag. Publish an overlap
   release whose ranges accept both snapshots, or keep consumers on exact
   versions until npm supports atomic multi-package promotion.

   npm registry reads can briefly return an older tag after `npm dist-tag`
   succeeds. The command waits for each planned tag change to become visible
   before starting the next one. It then polls until the complete `latest`
   snapshot exposes every intended version and dispatches stable finalization
   for the exact checked-out commit.

   If a command or network request fails after promotion starts, run the same
   command again. Tags already on the intended version are skipped, so a retry
   needs no npm one-time password when every tag is already current. A tag on a
   newer version stops the command before any tag is moved backward. If only
   the GitHub dispatch failed, the retry verifies npm again and retries that
   dispatch without republishing or moving a tag.

5. Follow the stable finalization run dispatched by `release:promote`. The
   workflow verifies every registry version and every `latest` tag from
   scratch. It derives the packages versioned by the release commit, creates
   their missing Git tags at that exact commit, and creates each GitHub Release
   from the matching changelog section. Matching tags and Releases are skipped
   on a retry. A tag at another commit or conflicting Release metadata stops
   finalization before it creates anything new. Only then can the matching
   production website deployment start.

## Package canaries

The Release workflow also builds a canary for every package-affecting push to
`main`. Every public package receives a prerelease version containing the
commit SHA, for example `0.148.2-canary.0123456789ab`. Internal package
references are rewritten to those exact versions before packing.

Canaries use a commit-specific non-consumer tag such as
`foldkit-canary-upload-0123456789ab` only for upload. The workflow does not
advertise a moving npm `canary` tag. After the complete registry check passes,
the workflow summary prints every exact package version and the exact
`create-foldkit-app` command. Rerunning a commit uses the same versions and
skips artifacts that already match.

For a new project, run the exact `create-foldkit-app` command from the workflow
summary. For an existing project, install every Foldkit package the project
uses at the version printed beside that package. For example:

```sh
pnpm add --save-exact \
  "foldkit@0.148.2-canary.0123456789ab" \
  "@foldkit/ui@0.148.2-canary.0123456789ab"
pnpm add --save-exact -D "@foldkit/vite-plugin@0.16.1-canary.0123456789ab"
```

The numeric version prefix can differ between packages. The shared commit
suffix identifies the coherent snapshot, so update every Foldkit package in the
project together.

## create-foldkit-app inputs

`create-foldkit-app` carries its scaffold sources in the package tarball. The
build copies every supported example, the rendering overlays, and a release
manifest into `dist/templates`. The manifest records the source commit and the
complete public package version map.

The CLI reads those bundled files at runtime. It does not fetch example files
from GitHub `main`, and it does not resolve Foldkit packages through npm
`latest`. A stable CLI therefore scaffolds its own released sources and exact
package versions. A canary CLI does the same with its commit-addressed package
snapshot.

The repository-only
`CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY` override remains available
for scaffold verification. It can replace the bundled example manifests under
test, but it does not replace the CLI's release version map.

## New public package names

The coherent uploader refuses any package name npm has never published. npm can
assign `latest` during a first publication even when a different upload tag was
requested. That behavior would expose the new package before the complete
snapshot passed verification.

Bootstrap a new package name before adding its non-private manifest to the
workspace release set. Publish the intended initial stable version manually
with an interactive npm account and 2FA, accepting that this deliberate first
release establishes `latest`. Then configure `release.yml` as the package's
trusted publisher and add its public manifest to the workspace. Do not let a
canary workflow perform the first publication. Discovery will include the new
package automatically, and the omission gate will prevent a partial coherent
set.

## Authentication constraints

npm's trusted-publishing documentation limits OIDC authentication to
`npm publish` and `npm stage publish`. It does not authorize `npm dist-tag` or
interactive staged approval. See:

- <https://docs.npmjs.com/trusted-publishers/>
- <https://docs.npmjs.com/cli/commands/npm-dist-tag/>
- <https://docs.npmjs.com/staged-publishing/>

Do not add an npm token to automate promotion without a separate security
decision. Package upload must continue through the trusted `release.yml`
workflow so npm generates provenance for each public tarball.

A bypass-2FA granular access token is not an acceptable bridge. It would put a
long-lived write credential in GitHub Actions, and npm has announced that these
tokens will lose direct publishing around January 2027. See:

- <https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/>

Stable promotion therefore remains one local command with one interactive npm
one-time password. The rest of the release proceeds automatically after the
complete `latest` snapshot verifies. A zero-touch stable release can replace
this step when npm supports OIDC-authenticated tag changes or another coherent
multi-package promotion mechanism.

## Website deployment

The production website does not deploy when the quarantine upload finishes.
The finalization dispatch first proves that every intended version is on npm
and every `latest` tag points to it, then finishes the GitHub release metadata.
The website workflow checks out that exact release commit. Its existing gate
then checks the playground versions, normal npm peer resolution, package-source
release tags, the generated SSG project, and the live SSR and SSG playgrounds
before the deployment completes.

Website-only pushes still use the normal production deployment workflow. Its
package-source authorization prevents unreleased package work from reaching
the site.
