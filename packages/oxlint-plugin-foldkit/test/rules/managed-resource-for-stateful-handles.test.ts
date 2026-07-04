import type { CreateRule, OxlintScope, Variable } from 'effect-oxlint'
import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { managedResourceForStatefulHandles } from '../../src/rules/managed-resource-for-stateful-handles.ts'

const STATEFUL_CONSTRUCTOR_NAMES = [
  'WebSocket',
  'MediaRecorder',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
]

const UPSTREAM_EXEMPTED_FILENAMES = [
  '/repo/apps/ui/src/page/chat/managedResource.ts',
  '/repo/apps/ui/src/page/chat/managed-resource.ts',
  '/repo/apps/ui/src/page/chat/managed-resources-live.ts',
  '/repo/apps/ui/src/page/chat/subscription.ts',
  '/repo/apps/ui/src/page/chat/subscription-keyboard.ts',
  '/repo/apps/ui/src/client/pi-runtime.ts',
]

const isVisitorHandler = (value: unknown): value is (node: unknown) => void =>
  typeof value === 'function'

const locallyBoundVariable = (name: string): Variable => {
  const bindingIdentifier = Testing.id(name)
  return {
    ...Testing.variable(name),
    defs: [
      {
        type: 'Variable',
        name: bindingIdentifier,
        node: bindingIdentifier,
        parent: null,
      },
    ],
  }
}

const runRuleWithLocalBinding = (
  rule: CreateRule,
  event: string,
  node: unknown,
  localName: string,
): ReadonlyArray<Testing.ReportedDiagnostic> => {
  const mock = Testing.createMockContext()
  const scopeWithLocalBinding: OxlintScope = Testing.scope({
    variables: [locallyBoundVariable(localName)],
  })
  const context = {
    ...mock.context,
    sourceCode: {
      ...mock.context.sourceCode,
      getScope: () => scopeWithLocalBinding,
    },
  }
  const visitors: Record<string, unknown> = rule.create(context)
  const handler = visitors[event]
  if (isVisitorHandler(handler)) {
    handler(node)
  }
  return mock.diagnostics
}

const mediaCall = (callee: unknown) => ({
  type: 'CallExpression',
  callee,
  arguments: [Testing.id('constraints')],
})

describe('managed-resource-for-stateful-handles', () => {
  it('flags global stateful handle constructors', () => {
    for (const constructorName of STATEFUL_CONSTRUCTOR_NAMES) {
      const result = Testing.runRule(
        managedResourceForStatefulHandles,
        'NewExpression',
        Testing.newExpr(constructorName, [Testing.id('url')]),
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.diagnostic.message).toContain('ManagedResource')
      expect(result[0]?.diagnostic.message).toContain(
        `new ${constructorName}(...)`,
      )
    }
  })

  it('flags global navigator.mediaDevices.getUserMedia calls', () => {
    const callee = Testing.chainedMemberExpr(
      'navigator',
      'mediaDevices',
      'getUserMedia',
    )
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(callee),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('getUserMedia')
    expect(result[0]?.diagnostic.message).toContain('ManagedResource')
    expect(result[0]?.diagnostic.node).toBe(callee)
  })

  it('flags global navigator.mediaDevices.getDisplayMedia calls', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(
        Testing.chainedMemberExpr(
          'navigator',
          'mediaDevices',
          'getDisplayMedia',
        ),
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('getDisplayMedia')
    expect(result[0]?.diagnostic.message).toContain('ManagedResource')
  })

  it('flags in every file upstream used to exempt by path', () => {
    for (const filename of UPSTREAM_EXEMPTED_FILENAMES) {
      const result = Testing.runRule(
        managedResourceForStatefulHandles,
        'NewExpression',
        Testing.newExpr('WebSocket', [Testing.id('url')]),
        { filename },
      )

      expect(result).toHaveLength(1)
    }
  })

  it('allows constructors that resolve to a local binding', () => {
    const result = runRuleWithLocalBinding(
      managedResourceForStatefulHandles,
      'NewExpression',
      Testing.newExpr('WebSocket', [Testing.id('url')]),
      'WebSocket',
    )

    expect(result).toHaveLength(0)
  })

  it('allows constructors outside the stateful set', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'NewExpression',
      Testing.newExpr('AbortController', []),
    )

    expect(result).toHaveLength(0)
  })

  it('allows media acquisition through a local navigator', () => {
    const result = runRuleWithLocalBinding(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(
        Testing.chainedMemberExpr('navigator', 'mediaDevices', 'getUserMedia'),
      ),
      'navigator',
    )

    expect(result).toHaveLength(0)
  })

  it('allows mediaDevices methods outside the acquisition pair', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(
        Testing.chainedMemberExpr(
          'navigator',
          'mediaDevices',
          'enumerateDevices',
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not match four-segment member chains', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(
        Testing.chainedMemberExpr(
          'window',
          'navigator',
          'mediaDevices',
          'getUserMedia',
        ),
      ),
    )

    expect(result).toHaveLength(0)
  })

  it('does not match two-segment member chains', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall(Testing.memberExpr('mediaDevices', 'getUserMedia')),
    )

    expect(result).toHaveLength(0)
  })

  it('does not match computed segments in the chain', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'CallExpression',
      mediaCall({
        type: 'MemberExpression',
        object: Testing.computedMemberExpr('navigator', 'mediaDevices'),
        property: Testing.id('getUserMedia'),
        computed: false,
      }),
    )

    expect(result).toHaveLength(0)
  })

  it('does not match member-expression constructor callees', () => {
    const result = Testing.runRule(
      managedResourceForStatefulHandles,
      'NewExpression',
      Testing.newExpr(Testing.memberExpr('globalThis', 'WebSocket'), [
        Testing.id('url'),
      ]),
    )

    expect(result).toHaveLength(0)
  })
})
