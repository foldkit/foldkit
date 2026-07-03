import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/foldkit-primitives-declared-in-role-files.ts'

const filename = (path: string) => ({ filename: path })

const commandDefine = () => Testing.callOfMember('Command', 'define', [])

const subscriptionCall = (method: string) =>
  Testing.callOfMember('Subscription', method, [])

const importFoldkitMessage = () => Testing.importDecl('foldkit/message')

const importFoldkitSchema = (...names: ReadonlyArray<string>) =>
  Testing.importDeclWithSpecifiers(
    'foldkit/schema',
    names.map(name => Testing.importSpecifier(name)),
  )

describe('foldkit-primitives-declared-in-role-files', () => {
  it('flags imports from `foldkit/message` outside message role files', () => {
    const result = Testing.runRule(
      rule,
      'ImportDeclaration',
      importFoldkitMessage(),
      filename('/repo/apps/ui/src/page/tasks/update.ts'),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('message.ts')
  })

  it('allows imports from `foldkit/message` in `message.ts`', () => {
    const result = Testing.runRule(
      rule,
      'ImportDeclaration',
      importFoldkitMessage(),
      filename('/repo/apps/ui/src/page/tasks/message.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('allows imports from `foldkit/message` in a `message/` role folder', () => {
    const result = Testing.runRule(
      rule,
      'ImportDeclaration',
      importFoldkitMessage(),
      filename('/repo/apps/ui/src/page/tasks/message/index.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('flags the `m` specifier from `foldkit/schema` outside message role files', () => {
    const result = Testing.runRule(
      rule,
      'ImportDeclaration',
      importFoldkitSchema('ts', 'm'),
      filename('/repo/apps/ui/src/page/tasks/view.ts'),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Message constructors')
  })

  it('does not flag other `foldkit/schema` specifiers outside message role files', () => {
    const result = Testing.runRule(
      rule,
      'ImportDeclaration',
      importFoldkitSchema('ts'),
      filename('/repo/apps/ui/src/page/tasks/view.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('flags `Command.define(...)` outside command role files', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      commandDefine(),
      filename('/repo/apps/ui/src/page/tasks/update.ts'),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('command.ts')
  })

  it('allows `Command.define(...)` in `command.ts`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      commandDefine(),
      filename('/repo/apps/ui/src/page/tasks/command.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('allows `Command.define(...)` in a `command/` role folder', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      commandDefine(),
      filename('/repo/apps/ui/src/page/tasks/command/fetch.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it.each(['make', 'lift', 'aggregate', 'persistent'])(
    'flags `Subscription.%s(...)` outside subscription role files',
    method => {
      const result = Testing.runRule(
        rule,
        'CallExpression',
        subscriptionCall(method),
        filename('/repo/apps/ui/src/page/tasks/update.ts'),
      )
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(`Subscription.${method}`)
    },
  )

  it('allows Subscription primitives in `subscription.ts`', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      subscriptionCall('aggregate'),
      filename('/repo/apps/ui/src/page/tasks/subscription.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('allows Subscription primitives in a `subscription/` role folder', () => {
    const result = Testing.runRule(
      rule,
      'CallExpression',
      subscriptionCall('make'),
      filename('/repo/apps/ui/src/page/tasks/subscription/keyboard.ts'),
    )
    expect(result).toHaveLength(0)
  })

  it('does not flag unrelated Command or Subscription calls', () => {
    const commandResult = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('Command', 'mapMessages', []),
      filename('/repo/apps/ui/src/page/tasks/update.ts'),
    )
    const subscriptionResult = Testing.runRule(
      rule,
      'CallExpression',
      Testing.callOfMember('Subscription', 'unknown', []),
      filename('/repo/apps/ui/src/page/tasks/update.ts'),
    )
    expect(commandResult).toHaveLength(0)
    expect(subscriptionResult).toHaveLength(0)
  })
})
