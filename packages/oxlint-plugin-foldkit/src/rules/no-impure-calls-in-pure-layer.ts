import { Array, Effect, Option, String, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Scope,
  SourceCode,
  Visitor,
} from 'effect-oxlint'

const PURE_BASENAMES = [
  'init.ts',
  'model.ts',
  'message.ts',
  'update.ts',
  'view.ts',
]
const UPDATE_DIRECTORY_SEGMENT = '/update/'
const VIEW_DIRECTORY_SEGMENT = '/view/'

const IMPURE_MEMBER_CALLS = [
  'Date.now',
  'Math.random',
  'performance.now',
  'crypto.randomUUID',
  'crypto.getRandomValues',
]

const BROWSER_GLOBAL_NAMES = [
  'alert',
  'cancelAnimationFrame',
  'clearInterval',
  'clearTimeout',
  'confirm',
  'console',
  'crypto',
  'document',
  'fetch',
  'history',
  'localStorage',
  'location',
  'navigator',
  'performance',
  'prompt',
  'requestAnimationFrame',
  'sessionStorage',
  'setInterval',
  'setTimeout',
  'window',
]

const EXEMPT_FACTORY_PATHS = [
  'Command.define',
  'Mount.define',
  'Mount.defineStream',
  'Subscription.make',
]

const LISTENER_METHOD_NAME = 'addEventListener'

const impureMemberCallMessage = (calledName: string): string =>
  `\`${calledName}\` is a side effect and cannot run in Foldkit's pure layer. Move clock reads, randomness, and browser work into a Command, Mount, or Subscription factory and deliver the result to update as a Message.`

const LISTENER_MESSAGE =
  'Attaching an event listener in the pure layer leaks a side effect with no owned lifetime. Use Mount.defineStream for element events or a Subscription for window and document events so the runtime attaches and removes the listener.'

const NEW_DATE_MESSAGE =
  '`new Date()` reads the clock, so the pure layer stops being deterministic. Fetch the time in a Command, deliver it as a Message, and store it in the Model.'

const globalReadMessage = (globalName: string): string =>
  `Reading the browser global \`${globalName}\` in Foldkit's pure layer hides a side effect. init, update, and view must compute from the Model alone; move this into a Command, Mount, or Subscription factory.`

const pathBasename = (path: string): string =>
  pipe(path, String.split('/'), Array.lastNonEmpty)

const isPureLayerFile = (filename: string): boolean => {
  const normalizedFilename = filename.replaceAll('\\', '/')
  return (
    PURE_BASENAMES.includes(pathBasename(normalizedFilename)) ||
    normalizedFilename.includes(UPDATE_DIRECTORY_SEGMENT) ||
    normalizedFilename.includes(VIEW_DIRECTORY_SEGMENT)
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const rawMemberPath = (
  member: Record<string, unknown>,
  accumulated: ReadonlyArray<string>,
): Option.Option<Array.NonEmptyReadonlyArray<string>> => {
  if (member.computed === true) return Option.none()
  const property = member.property
  if (
    !isRecord(property) ||
    property.type !== 'Identifier' ||
    typeof property.name !== 'string'
  ) {
    return Option.none()
  }
  const object = member.object
  if (!isRecord(object)) return Option.none()
  const path = [property.name, ...accumulated]
  if (object.type === 'MemberExpression') return rawMemberPath(object, path)
  return object.type === 'Identifier' && typeof object.name === 'string'
    ? Option.some([object.name, ...path])
    : Option.none()
}

const calleeMemberPath = (
  callee: unknown,
): Option.Option<Array.NonEmptyReadonlyArray<string>> => {
  if (!isRecord(callee)) return Option.none()
  if (callee.type === 'MemberExpression') return rawMemberPath(callee, [])
  if (callee.type === 'CallExpression') return calleeMemberPath(callee.callee)
  return Option.none()
}

const isExemptFactoryCall = (node: Record<string, unknown>): boolean =>
  node.type === 'CallExpression' &&
  Option.match(calleeMemberPath(node.callee), {
    onNone: () => false,
    onSome: path => EXEMPT_FACTORY_PATHS.includes(path.join('.')),
  })

const hasExemptFactoryAncestor = (node: unknown): boolean => {
  if (!isRecord(node)) return false
  const parent = node.parent
  if (!isRecord(parent)) return false
  return isExemptFactoryCall(parent) || hasExemptFactoryAncestor(parent)
}

const parentRecord = (
  node: unknown,
): Option.Option<Record<string, unknown>> => {
  if (!isRecord(node)) return Option.none()
  const parent = node.parent
  return isRecord(parent) ? Option.some(parent) : Option.none()
}

const isMemberPropertyPosition = (node: ESTree.Node): boolean =>
  Option.match(parentRecord(node), {
    onNone: () => false,
    onSome: parent =>
      parent.type === 'MemberExpression' &&
      parent.computed !== true &&
      parent.property === node,
  })

const isStaticObjectKeyPosition = (node: ESTree.Node): boolean =>
  Option.match(parentRecord(node), {
    onNone: () => false,
    onSome: parent =>
      parent.type === 'Property' &&
      parent.computed !== true &&
      parent.key === node &&
      parent.value !== node,
  })

const isTypePositionIdentifier = (node: ESTree.Node): boolean =>
  Option.match(parentRecord(node), {
    onNone: () => false,
    onSome: parent =>
      typeof parent.type === 'string' &&
      parent.type.startsWith('TS') &&
      parent.expression !== node,
  })

const isFlaggedCallPath = (
  path: Array.NonEmptyReadonlyArray<string>,
): boolean =>
  IMPURE_MEMBER_CALLS.includes(path.join('.')) ||
  Array.lastNonEmpty(path) === LISTENER_METHOD_NAME

const isObjectOfFlaggedImpureCall = (node: ESTree.Node): boolean =>
  Option.match(parentRecord(node), {
    onNone: () => false,
    onSome: parent => {
      if (parent.type !== 'MemberExpression' || parent.object !== node) {
        return false
      }
      return Option.match(parentRecord(parent), {
        onNone: () => false,
        onSome: grandparent =>
          grandparent.type === 'CallExpression' &&
          grandparent.callee === parent &&
          Option.match(rawMemberPath(parent, []), {
            onNone: () => false,
            onSome: isFlaggedCallPath,
          }),
      })
    },
  })

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

/** Flags clock reads, randomness, listener attachment, and browser global reads in Foldkit's pure layer (init, Model, Message, update, view files). Side effects belong in Command, Mount, or Subscription factories, delivered back to update as Messages. */
export const noImpureCallsInPureLayer = Rule.define({
  name: 'no-impure-calls-in-pure-layer',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep init, Model, Message, update, and view files free of side effects.',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    const reportImpureMemberCall = (
      node: ESTree.CallExpression,
      calledName: string,
    ): Effect.Effect<void, never, RuleContext> => {
      const callee = node.callee
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier'
      ) {
        const objectIdentifier = callee.object
        return Effect.flatMap(
          isGlobalName(objectIdentifier, objectIdentifier.name),
          isGlobal =>
            isGlobal
              ? ctx.report(
                  Diagnostic.make({
                    node,
                    message: impureMemberCallMessage(calledName),
                  }),
                )
              : Effect.void,
        )
      }
      return ctx.report(
        Diagnostic.make({ node, message: impureMemberCallMessage(calledName) }),
      )
    }

    const checkCallExpression = (node: ESTree.CallExpression) => {
      if (hasExemptFactoryAncestor(node)) return Effect.void
      return Option.match(calleeMemberPath(node.callee), {
        onNone: () => Effect.void,
        onSome: path => {
          const calledName = path.join('.')
          if (IMPURE_MEMBER_CALLS.includes(calledName)) {
            return reportImpureMemberCall(node, calledName)
          }
          if (Array.lastNonEmpty(path) === LISTENER_METHOD_NAME) {
            return ctx.report(
              Diagnostic.make({ node, message: LISTENER_MESSAGE }),
            )
          }
          return Effect.void
        },
      })
    }

    const checkNewExpression = (node: ESTree.NewExpression) => {
      if (
        node.callee.type !== 'Identifier' ||
        node.callee.name !== 'Date' ||
        Array.isArrayNonEmpty(node.arguments) ||
        hasExemptFactoryAncestor(node)
      ) {
        return Effect.void
      }
      return ctx.report(Diagnostic.make({ node, message: NEW_DATE_MESSAGE }))
    }

    const checkIdentifier = (
      node: Extract<ESTree.Node, Readonly<{ type: 'Identifier' }>>,
    ) => {
      if (!BROWSER_GLOBAL_NAMES.includes(node.name)) return Effect.void
      if (
        isMemberPropertyPosition(node) ||
        isStaticObjectKeyPosition(node) ||
        isTypePositionIdentifier(node) ||
        isObjectOfFlaggedImpureCall(node) ||
        hasExemptFactoryAncestor(node)
      ) {
        return Effect.void
      }
      return Effect.flatMap(isGlobalName(node, node.name), isGlobal =>
        isGlobal
          ? ctx.report(
              Diagnostic.make({
                node,
                message: globalReadMessage(node.name),
              }),
            )
          : Effect.void,
      )
    }

    return yield* Visitor.filter(
      isPureLayerFile,
      Visitor.merge(
        Visitor.on('CallExpression', checkCallExpression),
        Visitor.on('NewExpression', checkNewExpression),
        Visitor.on('Identifier', checkIdentifier),
      ),
    )
  },
})
