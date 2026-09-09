import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { resolveChangedFiles } from './changed-files.mjs'

const ZERO_SHA = '0'.repeat(40)
const MISSING_SHA_A = 'deadbeef'.repeat(5)
const MISSING_SHA_B = 'cafebabe'.repeat(5)

test('an explicit file list is used verbatim', () => {
  const { changedFiles, isUnknownDiff } = resolveChangedFiles([
    'base',
    'head',
    'a.ts',
    'b.ts',
  ])

  assert.deepEqual(changedFiles, ['a.ts', 'b.ts'])
  assert.equal(isUnknownDiff, false)
})

test('an explicit file list wins over unresolvable revisions', () => {
  const { changedFiles, isUnknownDiff } = resolveChangedFiles([
    MISSING_SHA_A,
    MISSING_SHA_B,
    'a.ts',
  ])

  assert.deepEqual(changedFiles, ['a.ts'])
  assert.equal(isUnknownDiff, false)
})

test('no revisions is an unknown diff', () => {
  const { changedFiles, isUnknownDiff } = resolveChangedFiles([])

  assert.deepEqual(changedFiles, [])
  assert.equal(isUnknownDiff, true)
})

test('a missing head revision is an unknown diff', () => {
  assert.equal(resolveChangedFiles(['base']).isUnknownDiff, true)
})

test('an all-zero base revision is an unknown diff', () => {
  assert.equal(resolveChangedFiles([ZERO_SHA, 'head']).isUnknownDiff, true)
})

test('an all-zero head revision is an unknown diff', () => {
  assert.equal(resolveChangedFiles(['base', ZERO_SHA]).isUnknownDiff, true)
})

test('a failed git diff is an unknown diff rather than an empty one', () => {
  const { changedFiles, isUnknownDiff } = resolveChangedFiles([
    MISSING_SHA_A,
    MISSING_SHA_B,
  ])

  assert.deepEqual(changedFiles, [])
  assert.equal(isUnknownDiff, true)
})

test('a real revision range resolves the files it touched', () => {
  const { changedFiles, isUnknownDiff } = resolveChangedFiles([
    'HEAD~1',
    'HEAD',
  ])

  assert.equal(isUnknownDiff, false)
  assert.ok(changedFiles.length > 0)
  assert.ok(changedFiles.every(fileName => fileName !== ''))
})

const git = (repositoryDir, ...args) => {
  const result = spawnSync(
    'git',
    [
      '-C',
      repositoryDir,
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=Test',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { encoding: 'utf8' },
  )

  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`)

  return result.stdout.trim()
}

const commitFile = (repositoryDir, fileName) => {
  writeFileSync(join(repositoryDir, fileName), fileName)
  git(repositoryDir, 'add', fileName)
  git(repositoryDir, 'commit', '-m', `add ${fileName}`)

  return git(repositoryDir, 'rev-parse', 'HEAD')
}

test('a diverged base does not leak its own commits into the diff', () => {
  const repositoryDir = mkdtempSync(join(tmpdir(), 'changed-files-'))
  const originalCwd = process.cwd()

  try {
    git(repositoryDir, 'init', '-b', 'main')
    commitFile(repositoryDir, 'common.txt')

    git(repositoryDir, 'checkout', '-b', 'base')
    const baseSha = commitFile(repositoryDir, 'only-on-base.txt')

    git(repositoryDir, 'checkout', 'main')
    git(repositoryDir, 'checkout', '-b', 'head')
    const headSha = commitFile(repositoryDir, 'only-on-head.txt')

    process.chdir(repositoryDir)
    const { changedFiles, isUnknownDiff } = resolveChangedFiles([
      baseSha,
      headSha,
    ])

    assert.equal(isUnknownDiff, false)
    assert.deepEqual(changedFiles, ['only-on-head.txt'])
  } finally {
    process.chdir(originalCwd)
    rmSync(repositoryDir, { recursive: true, force: true })
  }
})
