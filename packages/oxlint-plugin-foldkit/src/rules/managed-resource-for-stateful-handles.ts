import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import {
  AST,
  Diagnostic,
  Rule,
  RuleContext,
  SourceCode,
  Visitor,
} from 'effect-oxlint'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Schema from 'effect/Schema'

const StatefulHandleConstructor = Schema.Literals([
  'WebSocket',
  'MediaRecorder',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
])
const isStatefulHandleConstructor = Schema.is(StatefulHandleConstructor)

const StatefulMediaDevicesPath = Schema.Tuple([
  Schema.Literal('navigator'),
  Schema.Literal('mediaDevices'),
  Schema.Literals(['getUserMedia', 'getDisplayMedia']),
])
const isStatefulMediaDevicesPath = Schema.is(StatefulMediaDevicesPath)

const STATEFUL_CONSTRUCTORS = HashSet.make(
  'WebSocket',
  'MediaRecorder',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
)

const basename = (filename: string): string => filename.replace(/^.*[\\/]/, '')

const isExemptFilename = (filename: string): boolean => {
  const normalized = filename.replaceAll('\\', '/')
  const base = basename(normalized)
  return (
    /^managed-?[rR]esources?.*\.tsx?$/.test(base) ||
    /^subscription.*\.tsx?$/.test(base) ||
    normalized.includes('/src/client/')
  )
}

const isIdentifier = (
  node: ESTree.Node,
): node is ESTree.Node & {
  readonly type: 'Identifier'
  readonly name: string
} => node.type === 'Identifier' && 'name' in node && P.isString(node.name)

const calleeIdentifier = (
  node: ESTree.NewExpression,
): Option.Option<
  ESTree.Node & { readonly type: 'Identifier'; readonly name: string }
> => (isIdentifier(node.callee) ? Option.some(node.callee) : Option.none())

const rootIdentifier = (
  node: ESTree.Node,
): Option.Option<
  ESTree.Node & { readonly type: 'Identifier'; readonly name: string }
> => {
  if (isIdentifier(node)) return Option.some(node)
  if (node.type !== 'MemberExpression') return Option.none()
  return rootIdentifier(node.object)
}

const memberPath = (
  call: ESTree.CallExpression,
): Option.Option<ReadonlyArray<string>> =>
  call.callee.type === 'MemberExpression'
    ? AST.memberPath(call.callee)
    : Option.none()

const statefulMediaDevicesCall = (
  call: ESTree.CallExpression,
): Option.Option<{
  readonly member: ESTree.MemberExpression
  readonly method: 'getUserMedia' | 'getDisplayMedia'
}> => {
  if (call.callee.type !== 'MemberExpression') return Option.none()
  const member = call.callee
  return pipe(
    memberPath(call),
    Option.filter(isStatefulMediaDevicesPath),
    Option.map(path => ({
      member,
      method: path[2],
    })),
  )
}

const reportConstructor = (
  ctx: RuleContext['Service'],
  node: ESTree.NewExpression,
  name: string,
): Effect.Effect<void> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Stateful browser handle \`new ${name}(...)\` must be acquired through \`ManagedResource.tag\` + \`ManagedResource.make\`, not constructed directly in model-tied code. (FK side-effect boundaries)`,
    }),
  )

const reportMediaDevices = (
  ctx: RuleContext['Service'],
  node: ESTree.MemberExpression,
  method: 'getUserMedia' | 'getDisplayMedia',
): Effect.Effect<void> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Stateful media handle \`navigator.mediaDevices.${method}(...)\` must be acquired through \`ManagedResource.tag\` + \`ManagedResource.make\`, with release owned by the resource lifecycle. (FK side-effect boundaries)`,
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'managed-resource-for-stateful-handles',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Require ManagedResource for stateful browser handles such as WebSocket, MediaRecorder, Worker, and media streams',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const visitor = Visitor.merge(
      Visitor.on('NewExpression', node =>
        pipe(
          calleeIdentifier(node),
          Option.filter(callee =>
            HashSet.has(STATEFUL_CONSTRUCTORS, callee.name),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: callee =>
              SourceCode.isGlobalReference(callee).pipe(
                Effect.flatMap(isGlobal =>
                  isGlobal && isStatefulHandleConstructor(callee.name)
                    ? reportConstructor(ctx, node, callee.name)
                    : Effect.void,
                ),
              ),
          }),
        ),
      ),
      Visitor.on('CallExpression', node =>
        pipe(
          statefulMediaDevicesCall(node),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ member, method }) =>
              pipe(
                rootIdentifier(member),
                Option.match({
                  onNone: () => Effect.void,
                  onSome: root =>
                    SourceCode.isGlobalReference(root).pipe(
                      Effect.flatMap(isGlobal =>
                        isGlobal
                          ? reportMediaDevices(ctx, member, method)
                          : Effect.void,
                      ),
                    ),
                }),
              ),
          }),
        ),
      ),
    )
    return yield* Visitor.filter(
      filename => !isExemptFilename(filename),
      visitor,
    )
  },
})

export default rule
