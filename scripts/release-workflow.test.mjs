import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const gitignore = readFileSync(resolve(REPO_ROOT, '.gitignore'), 'utf8')
const changesetConfig = JSON.parse(
  readFileSync(resolve(REPO_ROOT, '.changeset/config.json'), 'utf8'),
)
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

test('version planning coordinates shared inputs using the complete release history', () => {
  const versionJob = job('version', 'stable')

  assert.equal(
    rootPackage.scripts['version-packages'],
    'node scripts/version-packages.mjs',
  )
  assert.equal(
    rootPackage.scripts['version-packages:apply'],
    'changeset version && node scripts/version-alignment-notes.mjs && pnpm install --no-frozen-lockfile',
  )
  assert.match(
    versionJob,
    /- name: Checkout Repo\n\s+uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0\n\s+fetch-tags: true/,
  )
  assert.match(workflow, /^\s+- 'scripts\/prepare-website-release\.mjs'$/m)
  assert.match(workflow, /^\s+- 'scripts\/version-packages\.mjs'$/m)
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
    /permissions:\n\s+actions: write\n\s+contents: write\n\s+pull-requests: write/,
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
    versionJob,
    /- name: Start Version Packages required checks\n\s+if: steps\.changesets\.outputs\['has-changesets'\] == 'true'\n\s+env:\n\s+GH_TOKEN: \$\{\{ github\.token \}\}\n\s+run: \|\n\s+gh workflow run ci\.yml --ref changeset-release\/main\n\s+gh workflow run examples-e2e\.yml --ref changeset-release\/main/,
  )

  assert.match(
    stableJob,
    /if: github\.event_name == 'push' && needs\.version\.outputs\.has_changesets == 'false'/,
  )
  assert.match(stableJob, /\n    needs: version\n/)
  assert.match(stableJob, /permissions:\n\s+contents: read\n\s+id-token: write/)
  assert.doesNotMatch(stableJob, /contents: write/)
  assert.doesNotMatch(stableJob, /changesets\/action/)
  assert.match(stableJob, /run: pnpm release/)
  assert.doesNotMatch(coherentPublisher, /New tag:/)
  assert.match(stableJob, /NPM_CONFIG_PROVENANCE: true/)
})

test('stable promotion follows verified uploads and exposes the promoted commit', () => {
  const stableJob = job('stable', 'canary')
  const plan = stableJob.indexOf(
    'run: node scripts/coherent-release.mjs plan-stable',
  )
  const upload = stableJob.indexOf('run: pnpm release\n')
  const promotion = stableJob.indexOf('run: pnpm release:promote')

  assert.ok(plan > 0)
  assert.ok(upload > plan)
  assert.ok(promotion > upload)
  assert.match(
    stableJob,
    /outputs:\n\s+published_commit: \$\{\{ steps\.promote\.outputs\.published_commit \}\}/,
  )

  for (const step of [
    'Verify website package inputs are versioned',
    'Upload and verify stable packages',
    'Promote and verify the complete latest snapshot',
  ]) {
    const start = stableJob.indexOf(`- name: ${step}`)
    const nextStep = stableJob.indexOf('- name:', start + 1)
    const body = stableJob.slice(start, nextStep < 0 ? undefined : nextStep)

    assert.ok(start > 0)
    assert.match(body, /if: steps\.plan\.outputs\.has_release == 'true'/)
  }

  for (const publishingJob of [
    stableJob,
    job('canary', 'deploy-website-canary'),
  ]) {
    assert.match(publishingJob, /npm-11\.21\.0\.tgz/)
    assert.match(publishingJob, /id-token: write/)
  }
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
    /PUBLISHED_COMMIT: \$\{\{ needs\.stable\.outputs\.published_commit \|\| inputs\.published_commit \}\}/,
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
    /ref: \$\{\{ env\.PUBLISHED_COMMIT \}\}\n\s+fetch-depth: 0\n\s+persist-credentials: false/,
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

test('promotion reports the exact verified release commit', () => {
  assert.equal(
    rootPackage.scripts['release:promote'],
    'node scripts/coherent-release.mjs promote',
  )
  assert.match(
    coherentReleaseCli,
    /const result = await promoteStableRelease\(\{ root: REPO_ROOT \}\)/,
  )
  assert.match(
    coherentReleaseCli,
    /writeOutput\('published_commit', result\.publishedCommit\)/,
  )
  assert.match(gitignore, /^\.pnpm-store\/$/m)
})

test('finalization accepts successful promotions and explicit recovery runs', () => {
  const finalizeJob = job('finalize', 'deploy-website')
  const condition = finalizeJob
    .match(/    if: >-\n([\s\S]*?)\n    runs-on:/)
    ?.at(1)

  assert.ok(condition)
  assert.match(finalizeJob, /needs: stable/)

  const cases = [
    {
      event: 'push',
      result: 'success',
      commit: 'release-commit',
      isCancelled: false,
      expected: true,
    },
    {
      event: 'push',
      result: 'success',
      commit: '',
      isCancelled: false,
      expected: false,
    },
    {
      event: 'push',
      result: 'failure',
      commit: 'release-commit',
      isCancelled: false,
      expected: false,
    },
    {
      event: 'push',
      result: 'skipped',
      commit: '',
      isCancelled: false,
      expected: false,
    },
    {
      event: 'workflow_dispatch',
      result: 'skipped',
      commit: '',
      isCancelled: false,
      expected: true,
    },
    {
      event: 'workflow_dispatch',
      result: 'skipped',
      commit: '',
      isCancelled: true,
      expected: false,
    },
  ]

  for (const scenario of cases) {
    assert.equal(
      runInNewContext(condition, {
        cancelled: () => scenario.isCancelled,
        github: { event_name: scenario.event },
        needs: {
          stable: {
            result: scenario.result,
            outputs: { published_commit: scenario.commit },
          },
        },
      }),
      scenario.expected,
      JSON.stringify(scenario),
    )
  }

  const deploymentJob = workflow.slice(workflow.indexOf('\n  deploy-website:'))

  assert.match(deploymentJob, /needs: finalize/)
  assert.match(
    deploymentJob,
    /!cancelled\(\) && needs\.finalize\.result == 'success'/,
  )
  assert.match(
    deploymentJob,
    /published_commit: \$\{\{ needs\.finalize\.outputs\.published_commit \}\}/,
  )
  assert.match(
    finalizeJob,
    /published_commit: \$\{\{ steps\.verify\.outputs\.published_commit \}\}/,
  )
  assert.match(
    finalizeJob,
    /echo "published_commit=\$\{resolved\}" >> "\$\{GITHUB_OUTPUT\}"/,
  )
})
