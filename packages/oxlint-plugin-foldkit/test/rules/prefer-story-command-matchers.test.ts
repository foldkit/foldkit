import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { preferStoryCommandMatchers } from '../../src/rules/prefer-story-command-matchers.ts'

const testFilename = '/repo/src/tasks.story.test.ts'

const commandElement = (collectionName: string) =>
  Testing.computedMemberExpr(collectionName, 'index')

const propertyAccess = (object: unknown, propertyName: string) => ({
  type: 'MemberExpression',
  computed: false,
  object,
  property: Testing.id(propertyName),
})

const optionalNameAccess = (collectionName: string) => ({
  type: 'ChainExpression',
  expression: {
    type: 'MemberExpression',
    computed: false,
    optional: true,
    object: commandElement(collectionName),
    property: Testing.id('name'),
  },
})

const expectMatcherCall = (
  expectArgument: unknown,
  matcherName: string,
  matcherArguments: ReadonlyArray<unknown>,
) => ({
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    computed: false,
    object: Testing.callExpr('expect', [expectArgument]),
    property: Testing.id(matcherName),
  },
  arguments: matcherArguments,
})

const nameMatcherObject = (name: string) =>
  Testing.objectExpr([{ key: 'name', value: Testing.strLiteral(name) }])

const runOnCall = (node: unknown, filename: string = testFilename) =>
  Testing.runRule(preferStoryCommandMatchers, 'CallExpression', node, {
    filename,
  })

describe('prefer-story-command-matchers', () => {
  it('flags toMatchObject with a Command name on a Command element', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Story.Command.expect')
  })

  it('flags toMatchObject with name and args keys', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('pageCommands'), 'toMatchObject', [
        Testing.objectExpr([
          { key: 'name', value: Testing.strLiteral('CreateTask') },
          { key: 'args', value: Testing.objectExpr([]) },
        ]),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags a singular command collection identifier', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('command'), 'toMatchObject', [
        nameMatcherObject('FetchTask'),
      ]),
    )

    expect(result).toHaveLength(1)
  })

  it('flags toBe on an optionally chained Command element name', () => {
    const result = runOnCall(
      expectMatcherCall(optionalNameAccess('commands'), 'toBe', [
        Testing.strLiteral('FetchTasks'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Story.Command.expect')
  })

  it('lints .test.tsx basenames', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
      '/repo/src/component.test.tsx',
    )

    expect(result).toHaveLength(1)
  })

  it('normalizes backslash paths before taking the basename', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
      'C:\\repo\\src\\component.test.tsx',
    )

    expect(result).toHaveLength(1)
  })

  it('ignores non-Pascal expected names in toMatchObject', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('fetchTasks'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores matcher objects with keys outside args and name', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        Testing.objectExpr([
          { key: 'name', value: Testing.strLiteral('FetchTasks') },
          { key: 'status', value: Testing.strLiteral('pending') },
        ]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores matcher objects without a name key', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        Testing.objectExpr([{ key: 'args', value: Testing.objectExpr([]) }]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores matcher objects containing spreads', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: Testing.id('name'),
              value: Testing.strLiteral('FetchTasks'),
            },
            { type: 'SpreadElement', argument: Testing.id('extras') },
          ],
        },
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores name values that are not string literals', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        Testing.objectExpr([{ key: 'name', value: Testing.id('FetchTasks') }]),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores expect arguments that are not Command element accesses', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('results'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores toBe assertions on properties other than name', () => {
    const result = runOnCall(
      expectMatcherCall(
        propertyAccess(commandElement('commands'), 'label'),
        'toBe',
        [Testing.strLiteral('FetchTasks')],
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores toBe with a non-Pascal expected string', () => {
    const result = runOnCall(
      expectMatcherCall(
        propertyAccess(commandElement('commands'), 'name'),
        'toBe',
        [Testing.strLiteral('fetchTasks')],
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('ignores receivers that are not a direct expect call', () => {
    const softExpectCall = {
      type: 'CallExpression',
      callee: Testing.memberExpr('expect', 'soft'),
      arguments: [commandElement('commands')],
    }
    const result = runOnCall({
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        computed: false,
        object: softExpectCall,
        property: Testing.id('toMatchObject'),
      },
      arguments: [nameMatcherObject('FetchTasks')],
    })

    expect(result).toHaveLength(0)
  })

  it('ignores source files', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
      '/repo/src/update.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('ignores non-test helpers inside test directories', () => {
    const result = runOnCall(
      expectMatcherCall(commandElement('commands'), 'toMatchObject', [
        nameMatcherObject('FetchTasks'),
      ]),
      '/repo/test/helpers.ts',
    )

    expect(result).toHaveLength(0)
  })
})
