import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed?: unknown
  readonly object?: unknown
  readonly property?: unknown
}

type CallExpressionLike = {
  readonly type: string
  readonly callee?: unknown
  readonly arguments?: ReadonlyArray<unknown>
}

type SpreadElementLike = {
  readonly type: string
  readonly argument?: unknown
}

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.Function

type ObjectExpressionLike = {
  readonly type: string
  readonly properties?: ReadonlyArray<unknown>
}

type ObjectPropertyLike = {
  readonly type: string
  readonly computed?: unknown
  readonly key?: unknown
  readonly value?: unknown
}

interface ToViewCandidate {
  readonly component: string
  readonly fn: FunctionLike
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpressionLike = (
  value: unknown,
): value is MemberExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isCallExpressionLike = (value: unknown): value is CallExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isSpreadElementLike = (value: unknown): value is SpreadElementLike =>
  P.isObject(value) && 'type' in value && value.type === 'SpreadElement'

const isFunctionLike = (value: unknown): value is FunctionLike =>
  P.isObject(value) &&
  'type' in value &&
  (value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression') &&
  'params' in value &&
  Array.isArray(value.params) &&
  'body' in value

const isObjectExpressionLike = (
  value: unknown,
): value is ObjectExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'ObjectExpression'

const isObjectPropertyLike = (value: unknown): value is ObjectPropertyLike =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (isIdentifierLike(value)) return Option.some([value.name])
  if (!isMemberExpressionLike(value) || value.computed === true) {
    return Option.none()
  }
  const property = value.property
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(value.object),
    Option.map(path => [...path, property.name]),
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

const uiViewComponentFromPath = (
  path: ReadonlyArray<string>,
): Option.Option<string> =>
  path.length === 3
    ? pipe(
        Option.all({
          root: Arr.get(path, 0),
          component: Arr.get(path, 1),
          method: Arr.get(path, 2),
        }),
        Option.filter(({ root, method }) => root === 'Ui' && method === 'view'),
        Option.map(({ component }) => component),
      )
    : Option.none()

const callPath = (
  call: CallExpressionLike,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => memberPath(call.callee)

const uiViewCallComponent = (
  call: ESTree.CallExpression,
): Option.Option<string> =>
  pipe(callPath(call), Option.flatMap(uiViewComponentFromPath))

const uiViewMemberComponent = (value: unknown): Option.Option<string> =>
  pipe(memberPath(value), Option.flatMap(uiViewComponentFromPath))

const propertyKeyName = (
  property: ObjectPropertyLike,
): Option.Option<string> => {
  if (property.computed === true) return Option.none()
  const key = property.key
  if (isIdentifierLike(key)) return Option.some(key.name)
  return P.isObject(key) &&
    'type' in key &&
    key.type === 'Literal' &&
    'value' in key &&
    P.isString(key.value)
    ? Option.some(key.value)
    : Option.none()
}

const objectProperty = (
  object: ObjectExpressionLike,
  key: string,
): Option.Option<ObjectPropertyLike> =>
  pipe(
    object.properties ?? [],
    Arr.findFirst(
      (property): property is ObjectPropertyLike =>
        isObjectPropertyLike(property) &&
        pipe(
          propertyKeyName(property),
          Option.match({
            onNone: () => false,
            onSome: name => name === key,
          }),
        ),
    ),
  )

const objectValue = (
  object: ObjectExpressionLike,
  key: string,
): Option.Option<unknown> =>
  pipe(
    objectProperty(object, key),
    Option.flatMap(property => Option.fromNullishOr(property.value)),
  )

const firstObjectArgument = (
  call: ESTree.CallExpression,
): Option.Option<ObjectExpressionLike> =>
  pipe(Arr.head(call.arguments), Option.filter(isObjectExpressionLike))

const functionParamName = (fn: FunctionLike): Option.Option<string> =>
  pipe(
    Arr.head(fn.params),
    Option.filter(isIdentifierLike),
    Option.map(p => p.name),
  )

const toViewCandidatesInObject = (
  object: ObjectExpressionLike,
  component: string,
): ReadonlyArray<ToViewCandidate> =>
  pipe(
    object.properties ?? [],
    Arr.filterMap(property => {
      if (!isObjectPropertyLike(property)) return Result.failVoid
      return pipe(
        propertyKeyName(property),
        Option.filter(key => key === 'toView'),
        Option.flatMap(() =>
          pipe(
            Option.fromNullishOr(property.value),
            Option.filter(isFunctionLike),
          ),
        ),
        Option.map(fn => ({ component, fn })),
        Result.fromOption(() => undefined),
      )
    }),
  )

const directUiViewCandidates = (
  call: ESTree.CallExpression,
): ReadonlyArray<ToViewCandidate> =>
  pipe(
    uiViewCallComponent(call),
    Option.flatMap(component =>
      pipe(
        firstObjectArgument(call),
        Option.map(object => ({ component, object })),
      ),
    ),
    Option.match({
      onNone: () => [],
      onSome: ({ component, object }) =>
        toViewCandidatesInObject(object, component),
    }),
  )

const submodelViewInputsCandidates = (
  call: ESTree.CallExpression,
): ReadonlyArray<ToViewCandidate> =>
  pipe(
    callPath(call),
    Option.filter(
      path =>
        pathEquals(path, ['h', 'submodel']) || pathEquals(path, ['submodel']),
    ),
    Option.flatMap(() => firstObjectArgument(call)),
    Option.flatMap(config =>
      pipe(
        objectValue(config, 'view'),
        Option.flatMap(uiViewMemberComponent),
        Option.flatMap(component =>
          pipe(
            objectValue(config, 'viewInputs'),
            Option.filter(isObjectExpressionLike),
            Option.map(viewInputs => ({ component, viewInputs })),
          ),
        ),
      ),
    ),
    Option.match({
      onNone: () => [],
      onSome: ({ component, viewInputs }) =>
        toViewCandidatesInObject(viewInputs, component),
    }),
  )

const isParamRootedBundle = (value: unknown, paramName: string): boolean =>
  pipe(
    memberPath(value),
    Option.match({
      onNone: () => false,
      onSome: path => path.length > 1 && Arr.headNonEmpty(path) === paramName,
    }),
  )

const directCallArgumentUsesParamBundle = (
  value: unknown,
  paramName: string,
): boolean =>
  isCallExpressionLike(value) &&
  pipe(
    value.arguments ?? [],
    Arr.some(arg => isParamRootedBundle(arg, paramName)),
  )

const walkObjectChildren = (
  value: object,
  visit: (child: unknown) => boolean,
): boolean =>
  pipe(
    Object.entries(value),
    Arr.some(([key, child]) =>
      key === 'parent'
        ? false
        : Array.isArray(child)
          ? pipe(child, Arr.some(visit))
          : visit(child),
    ),
  )

const bodyUsesAttributeBundle = (
  value: unknown,
  paramName: string,
): boolean => {
  const walk = (node: unknown): boolean => {
    if (isSpreadElementLike(node)) {
      return isParamRootedBundle(node.argument, paramName)
    }
    if (isFunctionLike(node)) return false
    if (directCallArgumentUsesParamBundle(node, paramName)) return true
    return P.isObject(node) ? walkObjectChildren(node, walk) : false
  }
  return walk(value)
}

const bodyContainsHDialog = (value: unknown): boolean => {
  const walk = (node: unknown): boolean => {
    if (isFunctionLike(node)) return false
    if (
      isCallExpressionLike(node) &&
      pipe(
        callPath(node),
        Option.match({
          onNone: () => false,
          onSome: path => pathEquals(path, ['h', 'dialog']),
        }),
      )
    ) {
      return true
    }
    return P.isObject(node) ? walkObjectChildren(node, walk) : false
  }
  return walk(value)
}

const analyzeToView = (
  ctx: RuleContext['Service'],
  candidate: ToViewCandidate,
): Effect.Effect<void, never, RuleContext> => {
  const paramName = functionParamName(candidate.fn)
  const attributeCheck = pipe(
    paramName,
    Option.filter(name => bodyUsesAttributeBundle(candidate.fn.body, name)),
    Option.match({
      onSome: () => Effect.void,
      onNone: () =>
        ctx.report(
          Diagnostic.make({
            node: candidate.fn,
            message: `Ui.${candidate.component}.view toView callbacks must spread or pass through the Foldkit-provided attribute bundles. Otherwise ARIA, handlers, and submodel wiring can be dropped. (FK UI)`,
          }),
        ),
    }),
  )
  const dialogCheck =
    candidate.component === 'Dialog' && !bodyContainsHDialog(candidate.fn.body)
      ? ctx.report(
          Diagnostic.make({
            node: candidate.fn,
            message:
              'Ui.Dialog.view toView callbacks must render with `h.dialog(...)` so native dialog semantics and Foldkit dialog attributes stay attached. (FK UI)',
          }),
        )
      : Effect.void
  return Effect.all([attributeCheck, dialogCheck], {
    concurrency: 1,
    discard: true,
  })
}

const candidatesFromCall = (
  call: ESTree.CallExpression,
): ReadonlyArray<ToViewCandidate> => [
  ...directUiViewCandidates(call),
  ...submodelViewInputsCandidates(call),
]

const rule: CreateRule = Rule.define({
  name: 'ui-toview-must-spread-attribute-bundles',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Custom Ui.* toView callbacks must pass through Foldkit-provided attribute bundles; Dialog toViews must render h.dialog',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      Effect.forEach(
        candidatesFromCall(node),
        candidate => analyzeToView(ctx, candidate),
        {
          concurrency: 1,
          discard: true,
        },
      ),
    )
  },
})

export default rule
