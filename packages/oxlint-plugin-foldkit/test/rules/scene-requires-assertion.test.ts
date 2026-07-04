import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { sceneRequiresAssertion } from '../../src/rules/scene-requires-assertion.ts'

const call = (obj: string, prop: string, args: ReadonlyArray<unknown>) =>
  Testing.callOfMember(obj, prop, args)

const commandCall = (
  root: string,
  method: string,
  args: ReadonlyArray<unknown>,
) => ({
  type: 'CallExpression' as const,
  callee: Testing.chainedMemberExpr(root, 'Command', method),
  arguments: args,
  optional: false,
})

// `Scene.expect(inner).toExist()`
const expectChain = (inner: unknown) => ({
  type: 'CallExpression' as const,
  callee: {
    type: 'MemberExpression' as const,
    object: call('Scene', 'expect', [inner]),
    property: Testing.id('toExist'),
    computed: false,
    optional: false,
  },
  arguments: [],
  optional: false,
})

const run = (node: unknown) =>
  Testing.runRule(sceneRequiresAssertion, 'CallExpression', node)

describe('scene-requires-assertion', () => {
  it('flags a Scene.scene block that only sets up a model', () => {
    const result = run(
      call('Scene', 'scene', [
        Testing.strLiteral('renders'),
        call('Scene', 'with', [Testing.id('initialModel')]),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('assert')
  })

  it('flags a Story.story block that only sets up a model', () => {
    const result = run(
      call('Story', 'story', [
        Testing.id('update'),
        call('Story', 'with', [Testing.id('initialModel')]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('allows a Scene.scene block with an expect assertion', () => {
    const result = run(
      call('Scene', 'scene', [
        Testing.strLiteral('renders'),
        call('Scene', 'with', [Testing.id('initialModel')]),
        expectChain(call('Scene', 'text', [Testing.strLiteral('Buy milk')])),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Scene.scene block with an interaction and a Command resolve', () => {
    const result = run(
      call('Scene', 'scene', [
        Testing.strLiteral('adds a todo'),
        call('Scene', 'with', [Testing.id('initialModel')]),
        call('Scene', 'click', [
          call('Scene', 'label', [Testing.strLiteral('Buy milk')]),
        ]),
        commandCall('Scene', 'resolve', [
          Testing.id('SaveTodos'),
          Testing.id('savedTodos'),
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('allows a Story.story block with a Story.model assertion', () => {
    const result = run(
      call('Story', 'story', [
        Testing.id('update'),
        call('Story', 'with', [Testing.id('initialModel')]),
        call('Story', 'model', [Testing.arrowFn()]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores calls that are not Scene.scene or Story.story', () => {
    const result = run(
      Testing.callExpr('describe', [Testing.strLiteral('view')]),
    )

    expect(result).toHaveLength(0)
  })
})
