import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.Function

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type ObjectPropertyLike = {
  readonly type: string
  readonly computed?: unknown
  readonly key?: unknown
  readonly value?: unknown
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isFunctionLike = (value: unknown): value is FunctionLike =>
  P.isObject(value) &&
  'type' in value &&
  (value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression') &&
  'params' in value &&
  Array.isArray(value.params) &&
  'body' in value

const isObjectPropertyLike = (value: unknown): value is ObjectPropertyLike =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const mountDefineCall = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.CallExpression> => {
  if (AST.isCallOf(call, 'Mount', ['define', 'defineStream'])) {
    return Option.some(call)
  }
  return call.callee.type === 'CallExpression'
    ? mountDefineCall(call.callee)
    : Option.none()
}

const appliedMountFactory = (
  call: ESTree.CallExpression,
): Option.Option<FunctionLike> => {
  if (call.callee.type !== 'CallExpression') return Option.none()
  return pipe(
    mountDefineCall(call.callee),
    Option.flatMap(() => Arr.head(call.arguments)),
    Option.filter(arg => arg.type !== 'SpreadElement'),
    Option.filter(isFunctionLike),
  )
}

const returnedFunction = (fn: FunctionLike): Option.Option<FunctionLike> =>
  pipe(
    Option.fromNullishOr(fn.body),
    Option.flatMap(body => {
      if (isFunctionLike(body)) return Option.some(body)
      if (body.type !== 'BlockStatement') return Option.none()
      return pipe(
        body.body,
        Arr.filterMap(stmt => {
          if (stmt.type !== 'ReturnStatement') return Result.failVoid
          return pipe(
            Option.fromNullishOr(stmt.argument),
            Option.filter(isFunctionLike),
            Result.fromOption(() => undefined),
          )
        }),
        Arr.head,
      )
    }),
  )

const elementFactory = (factory: FunctionLike): FunctionLike =>
  pipe(
    returnedFunction(factory),
    Option.getOrElse(() => factory),
  )

const paramNames = (value: unknown): ReadonlyArray<string> => {
  if (!isFunctionLike(value)) return []
  return pipe(
    value.params,
    Arr.filterMap(param =>
      isIdentifierLike(param) ? Result.succeed(param.name) : Result.failVoid,
    ),
  )
}

const containsIdentifier = (
  root: unknown,
  activeNames: ReadonlyArray<string>,
): boolean => {
  if (Arr.isReadonlyArrayEmpty(activeNames)) return false
  if (isIdentifierLike(root)) return Arr.contains(activeNames, root.name)
  if (isObjectPropertyLike(root)) {
    return (
      (root.computed === true && containsIdentifier(root.key, activeNames)) ||
      containsIdentifier(root.value, activeNames)
    )
  }
  if (!P.isObject(root)) return false
  const nextNames = isFunctionLike(root)
    ? pipe(
        activeNames,
        Arr.filter(name => !Arr.contains(paramNames(root), name)),
      )
    : activeNames
  return pipe(
    Object.entries(root),
    Arr.some(([key, child]) =>
      key === 'parent'
        ? false
        : Array.isArray(child)
          ? pipe(
              child,
              Arr.some(item => containsIdentifier(item, nextNames)),
            )
          : containsIdentifier(child, nextNames),
    ),
  )
}

interface Offense {
  readonly fn: FunctionLike
  readonly message: string
}

const elementParamName = (fn: FunctionLike): Option.Option<string> =>
  pipe(
    Arr.head(fn.params),
    Option.filter(isIdentifierLike),
    Option.map(param => param.name),
  )

const diagnose = (factory: FunctionLike): Option.Option<Offense> => {
  const fn = elementFactory(factory)
  return pipe(
    elementParamName(fn),
    Option.match({
      onNone: () =>
        Option.some({
          fn,
          message:
            'Mount factories must accept and use the live element parameter. If the work does not need the element, use a Command, Subscription, or ManagedResource instead. (FK mount)',
        }),
      onSome: name =>
        name.startsWith('_')
          ? Option.some({
              fn,
              message: `Mount factory element parameter \`${name}\` is explicitly ignored. A Mount must use its live element; choose another primitive when the element is irrelevant. (FK mount)`,
            })
          : containsIdentifier(fn.body, [name])
            ? Option.none()
            : Option.some({
                fn,
                message: `Mount factory element parameter \`${name}\` is never used. If the work is not element-caused and element-targeted, use a Command, Subscription, or ManagedResource instead. (FK mount)`,
              }),
    }),
  )
}

const rule: CreateRule = Rule.define({
  name: 'mount-factory-must-use-element',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Require Mount.define / Mount.defineStream factories to use their live element parameter',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        appliedMountFactory(node),
        Option.flatMap(diagnose),
        Option.match({
          onNone: () => Effect.void,
          onSome: ({ fn, message }) =>
            ctx.report(Diagnostic.make({ node: fn, message })),
        }),
      ),
    )
  },
})

export default rule
