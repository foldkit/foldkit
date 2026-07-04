import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noRunEffectInStoryTests } from '../../src/rules/no-run-effect-in-story-tests.ts'

const run = (node: unknown, filename: string) =>
  Testing.runRule(noRunEffectInStoryTests, 'CallExpression', node, { filename })

describe('no-run-effect-in-story-tests', () => {
  it('flags Effect.runPromise in a story test file', () => {
    const result = run(
      Testing.callOfMember('Effect', 'runPromise', [Testing.id('effect')]),
      'story.test.ts',
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command.resolve')
  })

  it('flags Effect.runSync in a story test file', () => {
    const result = run(
      Testing.callOfMember('Effect', 'runSync', [Testing.id('effect')]),
      'story.test.ts',
    )

    expect(result).toHaveLength(1)
  })

  it('does not flag Effect.runPromise outside a test file', () => {
    const result = run(
      Testing.callOfMember('Effect', 'runPromise', [Testing.id('effect')]),
      'main.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-run Effect calls in a test file', () => {
    const result = run(
      Testing.callOfMember('Effect', 'gen', [Testing.arrowFn()]),
      'story.test.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('ignores run calls on other objects in a test file', () => {
    const result = run(
      Testing.callOfMember('Runtime', 'runPromise', [Testing.id('effect')]),
      'story.test.ts',
    )

    expect(result).toHaveLength(0)
  })
})
