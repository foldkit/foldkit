# Releasing

Foldkit releases run in GitHub Actions. Uploads and `latest` promotion use npm
trusted publishing through OIDC. The workflow verifies the complete public
package set before moving any tag, then creates GitHub Releases and deploys
the production website.

Each public package's `release.yml` trusted publisher must allow both
`npm publish` and `npm dist-tag`. See [Authentication](#authentication) for setup.

## Stable packages

`pnpm version-packages` requires a clean working tree with committed changesets.
The version planner compares shared build inputs with the latest published
website package release. When those inputs changed, it adds a generated patch
changeset for every website package before Changesets calculates the release.
Changesets keeps any larger bump already requested by a contributor. The planner
and publication check share the same input list and comparison. After versioning
and dependency installation, the planner checks shared inputs again. If those
steps introduced a shared change, it restores the original versioning files and
recalculates the release with coordination patches.

The generated `.changeset/generated-website-build-inputs.md` file is reserved for
the planner and is consumed during versioning. Contributors write changesets
that describe package changes and choose their bump types. The planner supplies
the coordination changesets for shared tooling changes. Planning needs the
complete release tag history and stops if the current package versions have not
been finalized yet.

1. Merge the Version Packages pull request.

2. The Release workflow's stable job discovers every public package from the
   pnpm workspace manifests. It builds and packs every untagged release
   version, then uploads them one at a time under the commit-specific
   non-consumer tag such as `foldkit-stable-upload-0123456789ab`. A rerun skips
   a matching version that npm already has and rejects one whose registry
   integrity differs.

3. The stable job fetches the complete public package set from npm and checks
   each internal dependency and peer range against the versions in this
   release. The last upload is not enough. Changesets only creates the Version
   Packages pull request; the coherent uploader runs in a separate workflow
   step.

4. The same job runs `pnpm release:promote` using its OIDC identity. Before
   changing a tag, the promoter refreshes `origin/main`. It checks that the
   clean checkout is an ancestor of current `main` and derives at least one
   versioned public package, including its changelog section, from that exact
   commit.

   Promotion repeats the complete registry check and reads every current
   `latest` manifest. It computes a promotion order where every intermediate
   mixture of old and new tags satisfies all internal dependency and peer
   ranges. It prefers `create-foldkit-app` first because that self-contained
   CLI already uses the exact uploaded versions. If no compatible order exists,
   the command stops without changing a tag. Publish an overlap release whose
   ranges accept both snapshots, or keep consumers on exact versions until npm
   supports atomic multi-package promotion.

   Registry reads can briefly return an older tag after `npm dist-tag`
   succeeds. The command waits for each tag change to become visible before
   starting the next one. It then waits until the complete `latest` snapshot
   exposes every intended version and reports the exact promoted commit to the
   next job.

5. The finalization job verifies every registry version and `latest` tag again.
   It derives the packages versioned by the release commit, creates their
   missing Git tags at that exact commit, and creates each GitHub Release from
   the matching changelog section. Matching tags and Releases are skipped on a
   retry. A tag at another commit or conflicting Release metadata stops
   finalization before it creates anything new. The production website
   deployment starts only after finalization succeeds and uses the same commit.

Pushes that do not version a public package skip stable upload, promotion, and
finalization. Package canaries still run. The release workflow serializes runs
on the same branch so releases cannot promote concurrently.

### Retrying a release

Rerun the failed jobs in the original Release workflow. Uploads skip matching
published artifacts, and promotion skips tags already on the intended version.
A tag on a newer version stops promotion before any tag moves backward. A
failure during upload or promotion prevents finalization and website deployment.

If every package is already promoted and only finalization needs recovery, run
the Release workflow manually from `main` with `published_commit` set to the
full release SHA. The recovery run checks that exact commit is on `main` and
verifies the complete `latest` snapshot before creating release metadata or
deploying the website.

`pnpm release:promote` also remains available from a clean local checkout of the
release commit. It uses an interactive npm session with 2FA outside GitHub
Actions. The command prompts once for an OTP or accepts `NPM_CONFIG_OTP`, keeps
the OTP out of command arguments, and removes it from non-npm subprocesses.
After local promotion, use the manual finalization recovery run above.

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
trusted publisher with `npm publish` and `npm dist-tag` allowed, then add its
public manifest to the workspace. Do not let a canary workflow perform the first
publication. Discovery will include the new
package automatically, and the omission gate will prevent a partial coherent
set.

## Authentication

For every public package on npm, open its package settings and enable
**Allow npm dist-tag** on the existing GitHub Actions trusted publisher for
`foldkit/foldkit`, workflow `release.yml`. Keep **Allow npm publish** enabled
for package uploads. Dist-tag permission is independent and defaults to off,
including on existing trusted publishers.

The workflow pins npm 11.21.0, which supports OIDC dist-tag operations, and grants
`id-token: write` to the stable and canary jobs. The npm CLI obtains short-lived
credentials from GitHub Actions for publishing and tag changes. No npm access
token or OTP secret is needed in Actions.

The promoter requires GitHub's OIDC request URL and token when running in
Actions. Missing `id-token: write` fails before tag changes. An npm permission
error requires checking **Allow npm dist-tag** on the affected package's trusted
publisher before rerunning the job. `npm whoami` does not check trusted publisher
permissions.

See [npm's dist-tag authentication documentation](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

## Website deployment

The production website does not deploy when the quarantine upload finishes.
The finalization job first proves that every intended version is on npm
and every `latest` tag points to it, then finishes the GitHub release metadata.
The website workflow checks out that exact release commit. Its existing gate
then checks the playground versions, normal npm peer resolution, package-source
release tags, the generated SSG project, and the live SSR and SSG playgrounds
before the deployment completes.

Website-only pushes still use the normal production deployment workflow. Its
package-source authorization prevents unreleased package work from reaching
the site.
