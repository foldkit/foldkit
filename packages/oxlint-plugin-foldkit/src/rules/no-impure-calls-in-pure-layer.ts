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
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Str from 'effect/String'

const PURE_BASENAMES = HashSet.make(
  'init.ts',
  'model.ts',
  'message.ts',
  'update.ts',
  'view.ts',
)

const GLOBALS = HashSet.make(
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
)

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const basename = (filename: string): string => {
  const parts = Str.split('/')(normalizedPath(filename))
  return pipe(
    Arr.last(parts),
    Option.getOrElse(() => filename),
  )
}

const isPureLayerFile = (filename: string): boolean => {
  const path = normalizedPath(filename)
  return (
    HashSet.has(PURE_BASENAMES, basename(path)) ||
    Str.includes('/update/')(path) ||
    Str.includes('/view/')(path)
  )
}

const pathEquals = (
  path: ReadonlyArray<string>,
  expected: ReadonlyArray<string>,
): boolean =>
  path.length === expected.length &&
  pipe(
    Arr.zip(path, expected),
    Arr.every(([left, right]) => left === right),
  )

const memberPathFromCallee = (
  callee: ESTree.CallExpression['callee'],
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (callee.type === 'MemberExpression') return AST.memberPath(callee)
  if (callee.type === 'CallExpression') {
    return memberPathFromCallee(callee.callee)
  }
  return Option.none()
}

const callMemberPath = (
  call: ESTree.CallExpression,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> =>
  memberPathFromCallee(call.callee)

const isExemptFactoryCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callMemberPath(call),
    Option.match({
      onNone: () => false,
      onSome: path =>
        pathEquals(path, ['Command', 'define']) ||
        pathEquals(path, ['Mount', 'define']) ||
        pathEquals(path, ['Mount', 'defineStream']) ||
        pathEquals(path, ['Subscription', 'make']),
    }),
  )

const parentOf = (node: {
  readonly parent?: unknown
}): Option.Option<{
  readonly type: string
  readonly parent?: unknown
}> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.filter(
      (
        parent,
      ): parent is { readonly type: string; readonly parent?: unknown } =>
        P.isObject(parent) && 'type' in parent && P.isString(parent.type),
    ),
  )

const isCallExpression = (node: {
  readonly type: string
  readonly parent?: unknown
}): node is ESTree.CallExpression => node.type === 'CallExpression'

const isWithinExemptFactory = (node: {
  readonly parent?: unknown
}): boolean => {
  const walk = (
    current: Option.Option<{
      readonly type: string
      readonly parent?: unknown
    }>,
  ): boolean =>
    Option.match(current, {
      onNone: () => false,
      onSome: ancestor =>
        isCallExpression(ancestor) && isExemptFactoryCall(ancestor)
          ? true
          : walk(parentOf(ancestor)),
    })
  return walk(parentOf(node))
}

type Identifier = ESTree.IdentifierName | ESTree.IdentifierReference

type IdentifierLike = {
  readonly type: string
  readonly name: string
  readonly parent?: unknown
}

const isStaticMemberProperty = (node: IdentifierLike): boolean =>
  pipe(
    parentOf(node),
    Option.match({
      onNone: () => false,
      onSome: parent =>
        parent.type === 'MemberExpression' &&
        'computed' in parent &&
        parent.computed === false &&
        'property' in parent &&
        parent.property === node,
    }),
  )

const isStaticObjectKey = (node: IdentifierLike): boolean =>
  pipe(
    parentOf(node),
    Option.match({
      onNone: () => false,
      onSome: parent =>
        parent.type === 'Property' &&
        'computed' in parent &&
        parent.computed === false &&
        'key' in parent &&
        parent.key === node &&
        'value' in parent &&
        parent.value !== node,
    }),
  )

const shouldSkipIdentifier = (node: IdentifierLike): boolean =>
  isWithinExemptFactory(node) ||
  isStaticMemberProperty(node) ||
  isStaticObjectKey(node)

const impureMemberName = (call: ESTree.CallExpression): Option.Option<string> =>
  pipe(
    callMemberPath(call),
    Option.flatMap(path => {
      if (pathEquals(path, ['Date', 'now'])) return Option.some('Date.now')
      if (pathEquals(path, ['Math', 'random']))
        return Option.some('Math.random')
      if (pathEquals(path, ['performance', 'now']))
        return Option.some('performance.now')
      if (pathEquals(path, ['crypto', 'randomUUID']))
        return Option.some('crypto.randomUUID')
      if (pathEquals(path, ['crypto', 'getRandomValues'])) {
        return Option.some('crypto.getRandomValues')
      }
      return Option.none()
    }),
  )

const isAddEventListenerCall = (call: ESTree.CallExpression): boolean =>
  pipe(
    callMemberPath(call),
    Option.match({
      onNone: () => false,
      onSome: path => Arr.lastNonEmpty(path) === 'addEventListener',
    }),
  )

const objectIdentifier = (
  call: ESTree.CallExpression,
): Option.Option<Identifier> =>
  call.callee.type === 'MemberExpression' &&
  call.callee.object.type === 'Identifier'
    ? Option.some(call.callee.object)
    : Option.none()

const newDateWithoutArgs = (node: ESTree.NewExpression): boolean =>
  node.callee.type === 'Identifier' &&
  node.callee.name === 'Date' &&
  node.arguments.length === 0

const reportImpureMember = (
  ctx: RuleContext['Service'],
  node: ESTree.CallExpression,
  name: string,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Do not call \`${name}\` in Foldkit's pure layer. Move time, randomness, DOM, and browser effects into Command, Mount, or Subscription factories. (FK purity)`,
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'no-impure-calls-in-pure-layer',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow time, randomness, DOM, and browser side effects in Foldkit pure-layer files',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.filter(
      isPureLayerFile,
      Visitor.merge(
        Visitor.on('CallExpression', node => {
          if (isWithinExemptFactory(node)) return Effect.void
          if (isAddEventListenerCall(node)) {
            return reportImpureMember(ctx, node, '.addEventListener')
          }
          return pipe(
            impureMemberName(node),
            Option.match({
              onNone: () => Effect.void,
              onSome: name =>
                pipe(
                  objectIdentifier(node),
                  Option.match({
                    onNone: () => reportImpureMember(ctx, node, name),
                    onSome: object =>
                      SourceCode.isGlobalReference(object).pipe(
                        Effect.flatMap(isGlobal =>
                          isGlobal
                            ? reportImpureMember(ctx, node, name)
                            : Effect.void,
                        ),
                      ),
                  }),
                ),
            }),
          )
        }),
        Visitor.on('NewExpression', node =>
          newDateWithoutArgs(node) && !isWithinExemptFactory(node)
            ? ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Do not call `new Date()` in Foldkit's pure layer. Request time through Commands and store it in the Model. (FK purity)",
                }),
              )
            : Effect.void,
        ),
        Visitor.on('Identifier', node =>
          HashSet.has(GLOBALS, node.name) && !shouldSkipIdentifier(node)
            ? SourceCode.isGlobalReference(node).pipe(
                Effect.flatMap(isGlobal =>
                  isGlobal
                    ? ctx.report(
                        Diagnostic.make({
                          node,
                          message: `Do not read browser/global \`${node.name}\` in Foldkit's pure layer. Move side effects into Command, Mount, or Subscription factories. (FK purity)`,
                        }),
                      )
                    : Effect.void,
                ),
              )
            : Effect.void,
        ),
      ),
    )
  },
})

export default rule
