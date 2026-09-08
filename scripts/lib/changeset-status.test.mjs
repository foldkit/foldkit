import assert from 'node:assert/strict'
import { test } from 'node:test'

import { shouldCheckChangesetStatus } from './changeset-status.mjs'

const repository = 'foldkit/foldkit'

const cases = [
  {
    name: 'the generated release pull request',
    context: {
      eventName: 'pull_request',
      headRef: 'changeset-release/main',
      headRepository: repository,
      repository,
    },
    expected: false,
  },
  {
    name: 'an ordinary same-repository pull request',
    context: {
      eventName: 'pull_request',
      headRef: 'fix/something',
      headRepository: repository,
      repository,
    },
    expected: true,
  },
  {
    name: 'a same-named fork pull request',
    context: {
      eventName: 'pull_request',
      headRef: 'changeset-release/main',
      headRepository: 'contributor/foldkit',
      repository,
    },
    expected: true,
  },
  {
    name: 'an ordinary fork pull request',
    context: {
      eventName: 'pull_request',
      headRef: 'fix/something',
      headRepository: 'contributor/foldkit',
      repository,
    },
    expected: true,
  },
  {
    name: 'a case-variant same-repository pull request',
    context: {
      eventName: 'pull_request',
      headRef: 'changeset-release/Main',
      headRepository: repository,
      repository,
    },
    expected: true,
  },
  {
    name: 'a push event',
    context: {
      eventName: 'push',
      headRef: undefined,
      headRepository: undefined,
      repository,
    },
    expected: false,
  },
]

for (const { name, context, expected } of cases) {
  test(`changeset status decision for ${name}`, () => {
    assert.equal(shouldCheckChangesetStatus(context), expected)
  })
}
