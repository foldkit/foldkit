import type { ESTree } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import * as P from 'effect/Predicate'
import { describe, expect, it } from 'vitest'

import rule from '../../src/rules/managed-resource-for-stateful-handles.ts'

const srcFile = '/repo/apps/ui/src/page/chat/command.ts'

const isNamedGlobal =
  (globals: ReadonlyArray<string>) => (candidate: unknown) =>
    P.isObject(candidate) &&
    'type' in candidate &&
    candidate.type === 'Identifier' &&
    'name' in candidate &&
    P.isString(candidate.name) &&
    globals.includes(candidate.name)

const runNewExpression = (
  node: ESTree.NewExpression,
  globals: ReadonlyArray<string>,
  filename = srcFile,
) => {
  const { context, diagnostics } = Testing.createMockContext({ filename })
  Object.defineProperty(context.sourceCode, 'isGlobalReference', {
    value: isNamedGlobal(globals),
  })
  const visitors = rule.create(context)
  visitors.NewExpression?.(node)
  return diagnostics
}

const runCallExpression = (
  node: ESTree.CallExpression,
  globals: ReadonlyArray<string>,
  filename = srcFile,
) => {
  const { context, diagnostics } = Testing.createMockContext({ filename })
  Object.defineProperty(context.sourceCode, 'isGlobalReference', {
    value: isNamedGlobal(globals),
  })
  const visitors = rule.create(context)
  visitors.CallExpression?.(node)
  return diagnostics
}

const mediaDevicesCall = (method: 'getUserMedia' | 'getDisplayMedia') => {
  const node = Testing.callExpr('placeholder')
  Object.defineProperty(node, 'callee', {
    value: Testing.chainedMemberExpr('navigator', 'mediaDevices', method),
  })
  return node
}

describe('managed-resource-for-stateful-handles', () => {
  it.each([
    'WebSocket',
    'MediaRecorder',
    'Worker',
    'SharedWorker',
    'RTCPeerConnection',
  ])(
    'flags global `new %s(...)` outside resource/subscription/client files',
    name => {
      const result = runNewExpression(Testing.newExpr(name), [name])
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain('ManagedResource')
    },
  )

  it('does not flag a local class named WebSocket', () => {
    const result = runNewExpression(Testing.newExpr('WebSocket'), [])
    expect(result).toHaveLength(0)
  })

  it('does not flag unrelated constructors', () => {
    const result = runNewExpression(Testing.newExpr('AbortController'), [
      'AbortController',
    ])
    expect(result).toHaveLength(0)
  })

  it.each([
    '/repo/apps/ui/src/page/chat/managedResource.ts',
    '/repo/apps/ui/src/page/chat/managed-resource.ts',
    '/repo/apps/ui/src/page/chat/managed-resources-live.ts',
    '/repo/apps/ui/src/page/chat/subscription.ts',
    '/repo/apps/ui/src/page/chat/subscription-keyboard.ts',
    '/repo/apps/ui/src/client/pi-runtime.ts',
  ])('does not flag exempt file `%s`', filename => {
    const result = runNewExpression(
      Testing.newExpr('WebSocket'),
      ['WebSocket'],
      filename,
    )
    expect(result).toHaveLength(0)
  })

  it.each(['getUserMedia', 'getDisplayMedia'] as const)(
    'flags global `navigator.mediaDevices.%s(...)`',
    method => {
      const result = runCallExpression(mediaDevicesCall(method), ['navigator'])
      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain(method)
      expect(result[0]?.diagnostic.message).toContain('ManagedResource')
    },
  )

  it('does not flag local `navigator.mediaDevices.getUserMedia(...)`', () => {
    const result = runCallExpression(mediaDevicesCall('getUserMedia'), [])
    expect(result).toHaveLength(0)
  })

  it('does not flag unrelated `navigator.mediaDevices.enumerateDevices(...)`', () => {
    const node = Testing.callExpr('placeholder')
    Object.defineProperty(node, 'callee', {
      value: Testing.chainedMemberExpr(
        'navigator',
        'mediaDevices',
        'enumerateDevices',
      ),
    })
    const result = runCallExpression(node, ['navigator'])
    expect(result).toHaveLength(0)
  })
})
