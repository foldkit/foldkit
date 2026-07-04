import { Array, Effect, Option, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Scope,
  SourceCode,
} from 'effect-oxlint'

const STATEFUL_CONSTRUCTOR_NAMES = [
  'WebSocket',
  'MediaRecorder',
  'Worker',
  'SharedWorker',
  'RTCPeerConnection',
]

const MEDIA_ACQUISITION_METHODS = ['getUserMedia', 'getDisplayMedia']

const statefulHandleMessage = (constructorName: string): string =>
  `\`new ${constructorName}(...)\` opens a stateful handle whose lifetime someone must own. Acquire it through a ManagedResource (ManagedResource.tag for the service, ManagedResource.make for acquire and release) so the runtime opens it while the Model condition holds and closes it when the condition clears. Inside a ManagedResource acquire Effect, suppress this line with an oxlint-disable comment.`

const mediaAcquisitionMessage = (methodName: string): string =>
  `\`navigator.mediaDevices.${methodName}(...)\` hands back a live MediaStream whose tracks hold the camera or microphone until stopped. Acquire it through ManagedResource.tag plus ManagedResource.make so release is owned by the resource lifecycle rather than scattered cleanup code. Inside a ManagedResource acquire Effect, suppress this line with an oxlint-disable comment.`

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isNewExpression = (node: ESTree.Node): node is ESTree.NewExpression =>
  node.type === 'NewExpression'

const isGlobalName = (
  node: ESTree.Node,
  name: string,
): Effect.Effect<boolean, never, RuleContext> =>
  Effect.map(SourceCode.getScope(node), scope =>
    Option.match(Scope.findVariableUp(scope, name), {
      onNone: () => true,
      onSome: variable => Array.isArrayEmpty(variable.defs),
    }),
  )

const matchedMediaMethod = (
  path: Array.NonEmptyReadonlyArray<string>,
): Option.Option<string> => {
  const [root, device, method, ...rest] = path
  if (
    root !== 'navigator' ||
    device !== 'mediaDevices' ||
    method === undefined ||
    Array.isArrayNonEmpty(rest)
  ) {
    return Option.none()
  }
  return MEDIA_ACQUISITION_METHODS.includes(method)
    ? Option.some(method)
    : Option.none()
}

const rootObjectIdentifier = (
  member: ESTree.MemberExpression,
): Option.Option<ESTree.Node> => {
  if (member.object.type === 'MemberExpression') {
    return rootObjectIdentifier(member.object)
  }
  return member.object.type === 'Identifier'
    ? Option.some(member.object)
    : Option.none()
}

const mediaAcquisition = (
  callee: ESTree.MemberExpression,
): Option.Option<
  Readonly<{ methodName: string; rootIdentifier: ESTree.Node }>
> =>
  pipe(
    AST.memberPath(callee),
    Option.flatMap(matchedMediaMethod),
    Option.flatMap(methodName =>
      pipe(
        rootObjectIdentifier(callee),
        Option.map(rootIdentifier => ({ methodName, rootIdentifier })),
      ),
    ),
  )

/** Flags ad hoc construction of stateful browser handles (sockets, recorders, workers, peer connections) and live media acquisition. These lifetimes belong to a ManagedResource so acquire and release follow the Model condition. */
export const managedResourceForStatefulHandles = Rule.define({
  name: 'managed-resource-for-stateful-handles',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Acquire stateful browser handles through a ManagedResource instead of constructing them ad hoc.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      NewExpression: (node: ESTree.Node) => {
        if (!isNewExpression(node)) return Effect.void
        const callee = node.callee
        if (
          callee.type !== 'Identifier' ||
          !STATEFUL_CONSTRUCTOR_NAMES.includes(callee.name)
        ) {
          return Effect.void
        }
        return Effect.flatMap(isGlobalName(callee, callee.name), isGlobal =>
          isGlobal
            ? ctx.report(
                Diagnostic.make({
                  node,
                  message: statefulHandleMessage(callee.name),
                }),
              )
            : Effect.void,
        )
      },
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          node.callee.type !== 'MemberExpression'
        ) {
          return Effect.void
        }
        const callee = node.callee
        return Option.match(mediaAcquisition(callee), {
          onNone: () => Effect.void,
          onSome: ({ methodName, rootIdentifier }) =>
            Effect.flatMap(
              isGlobalName(rootIdentifier, 'navigator'),
              isGlobal =>
                isGlobal
                  ? ctx.report(
                      Diagnostic.make({
                        node: callee,
                        message: mediaAcquisitionMessage(methodName),
                      }),
                    )
                  : Effect.void,
            ),
        })
      },
    }
  },
})
