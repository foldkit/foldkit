import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/ci.yml'),
  'utf8',
)
const examplesWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/examples-e2e.yml'),
  'utf8',
)
const rootPackage = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
)
const releaseWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/release.yml'),
  'utf8',
)

test('required workflows check pull requests and merge groups', () => {
  for (const requiredWorkflow of [workflow, examplesWorkflow]) {
    assert.match(
      requiredWorkflow,
      /on:\n\s+pull_request:\n\s+branches:\n\s+- main\n\s+merge_group:\n\s+types:\n\s+- checks_requested/,
    )
    assert.doesNotMatch(requiredWorkflow, /^\s+push:/m)
    assert.match(
      requiredWorkflow,
      /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.merge_group\.base_sha \}\}/,
    )
    assert.match(
      requiredWorkflow,
      /HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.event\.merge_group\.head_sha \}\}/,
    )
  }
})

test('changeset status receives trusted pull request context', () => {
  assert.match(
    workflow,
    /- name: Check changeset status\n\s+env:\n\s+FOLDKIT_CI_EVENT_NAME: \$\{\{ github\.event_name \}\}\n\s+FOLDKIT_CI_HEAD_REF: \$\{\{ github\.head_ref \}\}\n\s+FOLDKIT_CI_HEAD_REPOSITORY: \$\{\{ github\.event\.pull_request\.head\.repo\.full_name \}\}\n\s+FOLDKIT_CI_REPOSITORY: \$\{\{ github\.repository \}\}\n\s+run: node scripts\/check-changeset-status\.mjs/,
  )
})

test('the packed SSR consumer runs its critical browser matrix in CI', () => {
  assert.match(
    workflow,
    /playwright install --with-deps chromium firefox webkit/,
  )
  assert.equal(
    rootPackage.scripts['check:packed-ssr-consumer:ci'],
    'tsx scripts/check-packed-ssr-consumer.ts --skip-build --critical-browser-matrix',
  )
})

test('the website scope runs unit tests and typechecking', () => {
  const scopedCondition =
    "steps.scope.outputs.website == 'true' && steps.scope.outputs.full_workspace_checks == 'false'"

  assert.ok(
    workflow.includes(
      `      - name: Typecheck website\n        if: ${scopedCondition}\n        run: pnpm --filter website typecheck`,
    ),
  )
  assert.ok(
    workflow.includes(
      `      - name: Test website\n        if: ${scopedCondition}\n        run: pnpm --filter website test`,
    ),
  )
})

test('peer floor changes run the packed-manifest check before release', () => {
  assert.ok(
    workflow.includes(
      "      - name: Check packed peer dependency floors\n        if: steps.scope.outputs.peer_floors == 'true'\n        run: pnpm check:peer-floors",
    ),
  )
  assert.match(releaseWorkflow, /^\s+- 'scripts\/check-peer-floors\.ts'$/m)
})

test('stable publication verifies website package inputs before upload', () => {
  const stableJob = releaseWorkflow.slice(
    releaseWorkflow.indexOf('  stable:'),
    releaseWorkflow.indexOf('  canary:'),
  )
  const guardIndex = stableJob.indexOf(
    'Verify website package inputs are versioned',
  )
  const uploadIndex = stableJob.indexOf(
    '- name: Upload and verify stable packages',
  )

  assert.notEqual(guardIndex, -1)
  assert.notEqual(uploadIndex, -1)
  assert.ok(guardIndex < uploadIndex)
  assert.match(
    stableJob,
    /- name: Checkout Repo\n\s+uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0\n\s+fetch-tags: true/,
  )
  assert.match(
    stableJob,
    /- name: Verify website package inputs are versioned\n\s+run: pnpm check:website-release-inputs/,
  )
})

test('browser-backed scaffold checks install Chromium exactly once', () => {
  assert.ok(
    workflow.includes(
      "      - name: Install Chromium for the generated SSR gate\n        if: steps.scope.outputs.scaffold_server_rendering == 'true' && steps.scope.outputs.packed_ssr_consumer != 'true'\n        run: pnpm --filter @foldkit/examples-e2e exec playwright install --with-deps chromium",
    ),
  )
  assert.ok(
    workflow.includes(
      "      - name: Install Playwright chromium for the DOM state gate\n        if: steps.scope.outputs.dom_state_parity == 'true' && steps.scope.outputs.packed_ssr_consumer != 'true' && steps.scope.outputs.scaffold_server_rendering != 'true'",
    ),
  )
})
