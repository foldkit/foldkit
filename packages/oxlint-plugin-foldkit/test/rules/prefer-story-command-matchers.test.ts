import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/prefer-story-command-matchers.ts'

const testFile = '/repo/apps/ui/test/page/tasks/tasks.story.test.ts'
const sourceFile = '/repo/apps/ui/src/page/tasks/update.ts'

const runCall = (node: unknown, filename = testFile) =>
  Testing.runRule(rule, 'CallExpression', node, { filename })

const elementAccess = (name = 'commands') =>
  Testing.computedMemberExpr(name, 'index')

const expectMatcher = (
  matcher: string,
  expectArg: unknown,
  matcherArg: unknown,
) => {
  const expectCall = Testing.callExpr('expect', [expectArg])
  const node = Testing.callExpr('placeholder', [matcherArg])
  Object.defineProperty(node, 'callee', {
    value: {
      type: 'MemberExpression',
      object: expectCall,
      property: Testing.id(matcher),
      computed: false,
      optional: false,
    },
  })
  return node
}

const toMatchObject = (expectArg: unknown, objectArg: unknown) =>
  expectMatcher('toMatchObject', expectArg, objectArg)

const toBe = (expectArg: unknown, value: string) =>
  expectMatcher('toBe', expectArg, Testing.strLiteral(value))

const commandShape = (name: string, withArgs = false) =>
  Testing.objectExpr([
    { key: 'name', value: Testing.strLiteral(name) },
    ...(withArgs ? [{ key: 'args', value: Testing.objectExpr([]) }] : []),
  ])

const propertyAccess = (
  object: unknown,
  property: string,
  optional = false,
) => ({
  type: 'MemberExpression',
  object,
  property: Testing.id(property),
  computed: false,
  optional,
})

describe('prefer-story-command-matchers', () => {
  it('flags `expect(commands[0]).toMatchObject({ name: ... })`', () => {
    const result = runCall(
      toMatchObject(elementAccess('commands'), commandShape('FetchTasks')),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Story.Command.expect')
  })

  it('flags name+args command shape matchers', () => {
    const result = runCall(
      toMatchObject(
        elementAccess('pageCommands'),
        commandShape('CreateTask', true),
      ),
    )
    expect(result).toHaveLength(1)
  })

  it('flags singular command collection identifiers', () => {
    const result = runCall(
      toMatchObject(elementAccess('command'), commandShape('FetchTask')),
    )
    expect(result).toHaveLength(1)
  })

  it('flags `expect(commands[0]?.name).toBe(...)`', () => {
    const result = runCall(
      toBe(
        propertyAccess(elementAccess('commands'), 'name', true),
        'FetchTasks',
      ),
    )
    expect(result).toHaveLength(1)
  })

  it('does not flag command matcher objects without PascalCase names', () => {
    const result = runCall(
      toMatchObject(elementAccess('commands'), commandShape('fetchTasks')),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag objects with non-command keys', () => {
    const result = runCall(
      toMatchObject(
        elementAccess('commands'),
        Testing.objectExpr([
          { key: 'name', value: Testing.strLiteral('FetchTasks') },
          { key: 'status', value: Testing.strLiteral('pending') },
        ]),
      ),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag command matcher objects without a name key', () => {
    const result = runCall(
      toMatchObject(
        elementAccess('commands'),
        Testing.objectExpr([{ key: 'args', value: Testing.objectExpr([]) }]),
      ),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag toMatchObject when the expected value is not a command element access', () => {
    const result = runCall(
      toMatchObject(elementAccess('results'), commandShape('FetchTasks')),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag toBe when the asserted value is not `.name`', () => {
    const result = runCall(
      toBe(propertyAccess(elementAccess('commands'), 'label'), 'FetchTasks'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag toBe with non-PascalCase expected strings', () => {
    const result = runCall(
      toBe(propertyAccess(elementAccess('commands'), 'name'), 'fetchTasks'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not run outside apps/ui/test files', () => {
    const result = runCall(
      toMatchObject(elementAccess('commands'), commandShape('FetchTasks')),
      sourceFile,
    )
    expect(result).toHaveLength(0)
  })
})
