import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gitignore = readFileSync(resolve(REPO_ROOT, '.gitignore'), 'utf8')
const changesetReadme = readFileSync(
  resolve(REPO_ROOT, '.changeset/README.md'),
  'utf8',
)
const changesetConfig = JSON.parse(
  readFileSync(resolve(REPO_ROOT, '.changeset/config.json'), 'utf8'),
)
const releasingGuide = readFileSync(resolve(REPO_ROOT, 'RELEASING.md'), 'utf8')
const workflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/release.yml'),
  'utf8',
)
const canaryWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-canary.yml'),
  'utf8',
)
const rootPackage = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
)
const coherentPublisher = readFileSync(
  resolve(REPO_ROOT, 'scripts/lib/coherent-release.mjs'),
  'utf8',
)
const coherentReleaseCli = readFileSync(
  resolve(REPO_ROOT, 'scripts/coherent-release.mjs'),
  'utf8',
)

const job = (name, nextName) =>
  workflow.slice(
    workflow.indexOf(`\n  ${name}:`),
    workflow.indexOf(`\n  ${nextName}:`),
  )

test('package changelogs credit pull request authors', () => {
  assert.deepEqual(changesetConfig.changelog, [
    '@changesets/changelog-github',
    { repo: 'foldkit/foldkit' },
  ])
  assert.ok(rootPackage.devDependencies['@changesets/changelog-github'])

  const versionJob = job('version', 'stable')
  assert.match(versionJob, /github-token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/)
})

test('Changesets only versions packages and cannot parse publisher output', () => {
  assert.equal(
    rootPackage.scripts.release,
    'pnpm check:peer-floors && node scripts/coherent-release.mjs stable',
  )
  assert.doesNotMatch(rootPackage.scripts.release, /changeset publish/)
  assert.match(
    workflow,
    /uses: changesets\/action@v2\n\s+with:\n\s+version-script: pnpm version-packages/,
  )
  assert.doesNotMatch(workflow, /publish: pnpm release/)

  const versionJob = job('version', 'stable')
  const stableJob = job('stable', 'canary')

  assert.match(
    versionJob,
    /permissions:\n\s+contents: write\n\s+pull-requests: write/,
  )
  assert.doesNotMatch(versionJob, /id-token: write/)
  assert.doesNotMatch(versionJob, /run: pnpm release/)
  assert.match(
    versionJob,
    /outputs:\n\s+has_changesets: \$\{\{ steps\.changesets\.outputs\['has-changesets'\] \}\}/,
  )
  assert.match(
    versionJob,
    /uses: changesets\/action@v2\n\s+with:\n\s+version-script: pnpm version-packages\n\s+github-token: \$\{\{ secrets\.GITHUB_TOKEN \}\}\n\s+env:\n\s+SKIP_SIMPLE_GIT_HOOKS: '1'/,
  )
  assert.deepEqual(
    versionJob
      .split('\n')
      .filter(line => line.includes('SKIP_SIMPLE_GIT_HOOKS')),
    ["          SKIP_SIMPLE_GIT_HOOKS: '1'"],
  )

  assert.match(
    stableJob,
    /if: github\.event_name == 'push' && needs\.version\.outputs\.has_changesets == 'false'/,
  )
  assert.match(stableJob, /\n    needs: version\n/)
  assert.match(
    stableJob,
    /permissions:\n\s+contents: read\n\s+pull-requests: write\n\s+id-token: write/,
  )
  assert.doesNotMatch(stableJob, /contents: write/)
  assert.doesNotMatch(stableJob, /changesets\/action/)
  assert.match(stableJob, /run: pnpm release/)
  assert.doesNotMatch(coherentPublisher, /New tag:/)
  assert.match(stableJob, /NPM_CONFIG_PROVENANCE: true/)
})

test('stable uploads notify the merged Version Packages pull request', () => {
  const stableJob = job('stable', 'canary')
  const upload = stableJob.indexOf('run: pnpm release')
  const notification = stableJob.indexOf(
    '- name: Notify the maintainer that promotion is ready',
  )

  assert.ok(upload > 0)
  assert.ok(notification > upload)
  assert.match(stableJob, /uses: actions\/github-script@v9/)
  assert.match(stableJob, /listPullRequestsAssociatedWithCommit/)
  assert.match(
    stableJob,
    /pullRequest\.head\.ref === 'changeset-release\/main'/,
  )
  assert.match(stableJob, /No merged Version Packages pull request/)
  assert.match(stableJob, /@devinjameson The stable packages/)
  assert.match(stableJob, /git switch --detach \$\{context\.sha\}/)
  assert.match(stableJob, /pnpm install --frozen-lockfile/)
  assert.match(stableJob, /pnpm release:promote/)
  assert.match(stableJob, /npm OTP/)
  assert.match(stableJob, /github\.paginate/)
  assert.match(stableJob, /github\.rest\.issues\.updateComment/)
  assert.match(stableJob, /github\.rest\.issues\.createComment/)

  assert.match(
    changesetReadme,
    /Uploads and verifies the stable package set without moving `latest`/,
  )
  assert.match(
    changesetReadme,
    /Comments on the merged Version Packages pull request/,
  )
  assert.match(changesetReadme, /pnpm release:promote/)
  assert.match(
    releasingGuide,
    /Wait for GitHub Actions to mention `@devinjameson`/,
  )
  assert.match(
    releasingGuide,
    /A\s+rerun updates the existing comment instead of posting another notification/,
  )
  assert.match(releasingGuide, /`npm whoami` and `gh auth status`/)
})

test('canaries publish from the trusted release workflow and use exact snapshots', () => {
  assert.match(
    workflow,
    /canary:\n\s+name: Upload and verify commit-addressed package canary/,
  )
  assert.match(workflow, /run: pnpm release:canary/)
  assert.match(workflow, /^\s+- 'packages\/\*\*'$/m)
  assert.match(workflow, /^\s+- 'examples\/\*\*'$/m)
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/)

  const canaryJob = workflow.slice(
    workflow.indexOf('\n  canary:'),
    workflow.indexOf('\n  deploy-website-canary:'),
  )

  assert.doesNotMatch(canaryJob, /release:finalize-github|GitHub Releases/)
})

test('website canaries deploy only after their package snapshot is verified', () => {
  const packageCanary = workflow.indexOf('\n  canary:')
  const websiteCanary = workflow.indexOf('\n  deploy-website-canary:')

  assert.ok(packageCanary > 0)
  assert.ok(websiteCanary > packageCanary)
  assert.match(
    workflow,
    /deploy-website-canary:\n\s+needs: canary\n\s+uses: \.\/\.github\/workflows\/deploy-website-canary\.yml\n\s+with:\n\s+target: \$\{\{ github\.sha \}\}/,
  )
  assert.match(canaryWorkflow, /workflow_call:/)
  assert.doesNotMatch(canaryWorkflow, /\n  push:/)

  for (const path of [
    '.npmrc',
    'scripts/build-examples.ts',
    'scripts/check-playground-ssg-build.ts',
    'scripts/example-bridge.js',
    'scripts/restore-website-fonts.sh',
    'scripts/website-vercel-config.mjs',
    'tsconfig.base.json',
    '.github/workflows/deploy-website-build.yml',
    '.github/workflows/deploy-website-canary.yml',
  ]) {
    assert.match(workflow, new RegExp(`^\\s+- '${path}'$`, 'm'), path)
  }
})

test('website deployment waits for a separately verified latest promotion', () => {
  const finalize = workflow.indexOf('finalize:')
  const deploy = workflow.indexOf('deploy-website:')
  const finalizeJob = job('finalize', 'deploy-website')

  assert.ok(finalize > 0)
  assert.ok(deploy > finalize)
  assert.match(workflow, /run: pnpm release:verify-latest/)
  assert.match(
    workflow,
    /Verify every stable package and latest tag[\s\S]+Create matching Git tags and GitHub Releases/,
  )
  assert.match(workflow, /run: pnpm release:finalize-github/)
  assert.match(
    workflow,
    /PUBLISHED_COMMIT: \$\{\{ inputs\.published_commit \}\}/,
  )
  assert.match(
    workflow,
    /published_commit must be a full lowercase Git commit SHA/,
  )
  assert.match(
    workflow,
    /git merge-base --is-ancestor "\$\{resolved\}" refs\/remotes\/origin\/main/,
  )
  assert.match(
    workflow,
    /ref: \$\{\{ inputs\.published_commit \}\}\n\s+fetch-depth: 0\n\s+persist-credentials: false/,
  )
  assert.match(
    finalizeJob,
    /- name: Create matching Git tags and GitHub Releases\n\s+run: pnpm release:finalize-github\n\s+env:\n\s+GITHUB_TOKEN: \$\{\{ github\.token \}\}/,
  )
  assert.deepEqual(
    finalizeJob
      .split('\n')
      .filter(line => /GITHUB_TOKEN|github\.token/.test(line)),
    ['          GITHUB_TOKEN: ${{ github.token }}'],
  )
  assert.match(workflow, /finalize:[\s\S]+permissions:\n\s+contents: write/)
  assert.match(workflow, /needs: finalize/)
  assert.doesNotMatch(workflow, /needs: release\n\s+if: needs\.release/)
})

test('interactive promotion dispatches finalization after registry verification', () => {
  assert.equal(
    rootPackage.scripts['release:promote'],
    'node scripts/coherent-release.mjs promote',
  )
  assert.match(
    coherentReleaseCli,
    /const result = await promoteAndFinalizeCurrentWorkspace\(\{ root: REPO_ROOT \}\)/,
  )
  assert.match(
    coherentReleaseCli,
    /Dispatched stable finalization for \$\{result\.publishedCommit\}/,
  )
  assert.doesNotMatch(coherentReleaseCli, /Finalize the release with:/)
  assert.match(gitignore, /^\.pnpm-store\/$/m)
})
