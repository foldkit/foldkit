import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'

const SELECTION_COMPONENTS = HashSet.make(
  'Combobox',
  'Listbox',
  'Menu',
  'RadioGroup',
  'Tabs',
)

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

type ExpressionWrapperLike = {
  readonly type: string
  readonly expression?: unknown
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

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  P.isObject(value) && 'type' in value && P.isString(value.type)

const isCallExpressionNode = (value: unknown): value is ESTree.CallExpression =>
  isEstreeNode(value) && value.type === 'CallExpression'

const isExpressionWrapperLike = (
  value: unknown,
): value is ExpressionWrapperLike =>
  P.isObject(value) &&
  'type' in value &&
  P.isString(value.type) &&
  'expression' in value &&
  (value.type === 'ParenthesizedExpression' ||
    value.type === 'TSAsExpression' ||
    value.type === 'TSSatisfiesExpression' ||
    value.type === 'TSTypeAssertion' ||
    value.type === 'TSNonNullExpression' ||
    value.type === 'TSInstantiationExpression' ||
    value.type === 'ChainExpression')

const unwrapExpression = (value: unknown): unknown =>
  isExpressionWrapperLike(value) ? unwrapExpression(value.expression) : value

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  const unwrapped = unwrapExpression(value)
  if (isIdentifierLike(unwrapped)) return Option.some([unwrapped.name])
  if (!isMemberExpressionLike(unwrapped) || unwrapped.computed === true) {
    return Option.none()
  }
  const property = unwrapped.property
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(unwrapped.object),
    Option.map(path => [...path, property.name]),
  )
}

const segmentEquals = (
  path: ReadonlyArray<string>,
  index: number,
  expected: string,
): boolean =>
  pipe(
    Arr.get(path, index),
    Option.match({
      onNone: () => false,
      onSome: segment => segment === expected,
    }),
  )

const hasSelectionComponent = (path: ReadonlyArray<string>): boolean =>
  pipe(
    Arr.get(path, 1),
    Option.match({
      onNone: () => false,
      onSome: component => HashSet.has(SELECTION_COMPONENTS, component),
    }),
  )

const isSelectionFactoryPath = (
  path: Arr.NonEmptyReadonlyArray<string>,
): boolean =>
  ((path.length === 3 && segmentEquals(path, 2, 'create')) ||
    (path.length === 4 &&
      segmentEquals(path, 2, 'Multi') &&
      segmentEquals(path, 3, 'create'))) &&
  segmentEquals(path, 0, 'Ui') &&
  hasSelectionComponent(path)

const selectionFactoryPath = (
  call: ESTree.CallExpression,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> =>
  pipe(memberPath(call.callee), Option.filter(isSelectionFactoryPath))

const isSelectionFactoryCall = (call: ESTree.CallExpression): boolean =>
  Option.isSome(selectionFactoryPath(call))

const selectionFactoryName = (call: ESTree.CallExpression): string =>
  pipe(
    selectionFactoryPath(call),
    Option.match({
      onNone: () => 'Ui.<Component>.create',
      onSome: path => Arr.join(path, '.'),
    }),
  )

const exportedVariableDeclaration = (
  statement: ESTree.Program['body'][number],
): Option.Option<ESTree.VariableDeclaration> => {
  if (statement.type === 'VariableDeclaration') return Option.some(statement)
  if (statement.type !== 'ExportNamedDeclaration') return Option.none()
  return pipe(
    Option.fromNullishOr(statement.declaration),
    Option.filter(declaration => declaration.type === 'VariableDeclaration'),
  )
}

const topLevelDeclarators = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.VariableDeclarator> =>
  pipe(
    program.body,
    Arr.filterMap(statement =>
      pipe(
        exportedVariableDeclaration(statement),
        Option.map(declaration => declaration.declarations),
        Result.fromOption(() => undefined),
      ),
    ),
    Arr.flatten,
  )

const directInitializerFactory = (
  declarator: ESTree.VariableDeclarator,
): Option.Option<ESTree.CallExpression> =>
  pipe(
    Option.fromNullishOr(declarator.init),
    Option.map(unwrapExpression),
    Option.filter(isCallExpressionNode),
    Option.filter(isSelectionFactoryCall),
  )

const allowedFactoryCalls = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.CallExpression> =>
  pipe(
    topLevelDeclarators(program),
    Arr.filterMap(declarator =>
      pipe(
        directInitializerFactory(declarator),
        Result.fromOption(() => undefined),
      ),
    ),
  )

const walkChildren = <A>(
  value: object,
  visit: (child: unknown) => ReadonlyArray<A>,
): ReadonlyArray<A> =>
  pipe(
    Object.entries(value),
    Arr.flatMap(([key, child]) =>
      key === 'parent'
        ? []
        : Array.isArray(child)
          ? pipe(child, Arr.flatMap(visit))
          : visit(child),
    ),
  )

const selectionFactoryCallsIn = (
  root: unknown,
): ReadonlyArray<ESTree.CallExpression> => {
  const self =
    isCallExpressionNode(root) && isSelectionFactoryCall(root) ? [root] : []
  return P.isObject(root)
    ? [...self, ...walkChildren(root, selectionFactoryCallsIn)]
    : self
}

const isAllowedFactoryCall = (
  call: ESTree.CallExpression,
  allowed: ReadonlyArray<ESTree.CallExpression>,
): boolean =>
  pipe(
    allowed,
    Arr.some(item => item === call),
  )

const reportFactory = (
  ctx: RuleContext['Service'],
  call: ESTree.CallExpression,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node: call,
      message: `\`${selectionFactoryName(call)}(...)\` factories must be declared once as a module-scope variable initializer. Inline or function-scoped selection submodel factories can drift from update/view types and create unstable view identities. (FK UI)`,
    }),
  )

const analyze = (
  ctx: RuleContext['Service'],
  program: ESTree.Program,
): Effect.Effect<void, never, RuleContext> => {
  const allowed = allowedFactoryCalls(program)
  return Effect.forEach(
    selectionFactoryCallsIn(program),
    call =>
      isAllowedFactoryCall(call, allowed)
        ? Effect.void
        : reportFactory(ctx, call),
    { concurrency: 1, discard: true },
  )
}

const rule: CreateRule = Rule.define({
  name: 'selection-submodel-factory-at-module-scope',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Require Ui selection submodel factories to be declared once at module scope',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('Program:exit', node => analyze(ctx, node))
  },
})

export default rule
