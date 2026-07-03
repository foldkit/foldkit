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

type LazySlotKind = 'lazy' | 'keyed'

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type ExpressionWrapperLike = {
  readonly type: string
  readonly expression?: unknown
}

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.Function

interface LazySlot {
  readonly name: string
  readonly kind: LazySlotKind
  readonly initCall: ESTree.CallExpression
}

interface Offense {
  readonly node: ESTree.Node
  readonly message: string
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  P.isObject(value) && 'type' in value && P.isString(value.type)

const isCallExpressionNode = (value: unknown): value is ESTree.CallExpression =>
  isEstreeNode(value) && value.type === 'CallExpression'

const isVariableDeclarator = (
  value: unknown,
): value is ESTree.VariableDeclarator =>
  isEstreeNode(value) && value.type === 'VariableDeclarator'

const isFunctionLike = (value: unknown): value is FunctionLike =>
  P.isObject(value) &&
  'type' in value &&
  (value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionDeclaration' ||
    value.type === 'FunctionExpression') &&
  'params' in value &&
  Array.isArray(value.params) &&
  'body' in value

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

const createLazyKind = (
  call: ESTree.CallExpression,
): Option.Option<LazySlotKind> => {
  const callee = unwrapExpression(call.callee)
  if (!isIdentifierLike(callee)) return Option.none()
  if (callee.name === 'createLazy') return Option.some('lazy')
  if (callee.name === 'createKeyedLazy') return Option.some('keyed')
  return Option.none()
}

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

const topLevelVariableDeclarations = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.VariableDeclaration> =>
  pipe(
    program.body,
    Arr.filterMap(statement =>
      pipe(
        exportedVariableDeclaration(statement),
        Result.fromOption(() => undefined),
      ),
    ),
  )

const declaratorName = (
  declarator: ESTree.VariableDeclarator,
): Option.Option<string> =>
  isIdentifierLike(declarator.id)
    ? Option.some(declarator.id.name)
    : Option.none()

const directLazySlot = (
  declarator: ESTree.VariableDeclarator,
): Option.Option<LazySlot> =>
  pipe(
    declaratorName(declarator),
    Option.flatMap(name =>
      pipe(
        Option.fromNullishOr(declarator.init),
        Option.map(unwrapExpression),
        Option.filter(isCallExpressionNode),
        Option.flatMap(initCall =>
          pipe(
            createLazyKind(initCall),
            Option.map(kind => ({ name, kind, initCall })),
          ),
        ),
      ),
    ),
  )

const moduleLazySlots = (program: ESTree.Program): ReadonlyArray<LazySlot> =>
  pipe(
    topLevelVariableDeclarations(program),
    Arr.filter(declaration => declaration.kind === 'const'),
    Arr.flatMap(declaration =>
      pipe(
        declaration.declarations,
        Arr.filterMap(declarator =>
          pipe(
            directLazySlot(declarator),
            Result.fromOption(() => undefined),
          ),
        ),
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

const createLazyCallsIn = (
  root: unknown,
): ReadonlyArray<ESTree.CallExpression> => {
  const self =
    isCallExpressionNode(root) && Option.isSome(createLazyKind(root))
      ? [root]
      : []
  return P.isObject(root)
    ? [...self, ...walkChildren(root, createLazyCallsIn)]
    : self
}

const isAllowedCreateCall = (
  call: ESTree.CallExpression,
  slots: ReadonlyArray<LazySlot>,
): boolean =>
  pipe(
    slots,
    Arr.some(slot => slot.initCall === call),
  )

const createCallOffenses = (
  program: ESTree.Program,
  slots: ReadonlyArray<LazySlot>,
): ReadonlyArray<Offense> =>
  pipe(
    createLazyCallsIn(program),
    Arr.filter(call => !isAllowedCreateCall(call, slots)),
    Arr.map(call => ({
      node: call,
      message:
        '`createLazy()` and `createKeyedLazy()` slots must be direct module-scope `const` initializers. Recreating lazy slots in views or functions keeps the cache permanently cold. (FK lazy view)',
    })),
  )

const slotForCall = (
  call: ESTree.CallExpression,
  slots: ReadonlyArray<LazySlot>,
): Option.Option<LazySlot> => {
  const callee = unwrapExpression(call.callee)
  if (!isIdentifierLike(callee)) return Option.none()
  return pipe(
    slots,
    Arr.findFirst(slot => slot.name === callee.name),
  )
}

const argumentAt = (
  call: ESTree.CallExpression,
  index: number,
): Option.Option<ESTree.Node> =>
  pipe(
    Arr.get(call.arguments, index),
    Option.filter(argument => argument.type !== 'SpreadElement'),
  )

const viewFunctionArgument = (
  call: ESTree.CallExpression,
  slot: LazySlot,
): Option.Option<ESTree.Node> => argumentAt(call, slot.kind === 'lazy' ? 0 : 1)

const paramNames = (fn: FunctionLike): ReadonlyArray<string> =>
  pipe(
    fn.params,
    Arr.filterMap(param =>
      isIdentifierLike(param) ? Result.succeed(param.name) : Result.failVoid,
    ),
  )

const functionName = (fn: FunctionLike): Option.Option<string> =>
  fn.type === 'FunctionDeclaration'
    ? pipe(
        Option.fromNullishOr(fn.id),
        Option.filter(isIdentifierLike),
        Option.map(id => id.name),
      )
    : Option.none()

const bindingNamesIn = (root: unknown): ReadonlyArray<string> => {
  if (isFunctionLike(root)) {
    return pipe(
      functionName(root),
      Option.match({
        onNone: () => [],
        onSome: name => [name],
      }),
    )
  }
  const self =
    isVariableDeclarator(root) && isIdentifierLike(root.id)
      ? [root.id.name]
      : []
  return P.isObject(root)
    ? [...self, ...walkChildren(root, bindingNamesIn)]
    : self
}

const functionScopeBindings = (fn: FunctionLike): HashSet.HashSet<string> =>
  pipe(
    [
      ...paramNames(fn),
      ...pipe(
        functionName(fn),
        Option.match({
          onNone: () => [],
          onSome: name => [name],
        }),
      ),
      ...bindingNamesIn(fn.body),
    ],
    HashSet.fromIterable,
  )

const isFunctionScopedName = (
  name: string,
  scopes: ReadonlyArray<HashSet.HashSet<string>>,
): boolean =>
  pipe(
    scopes,
    Arr.some(scope => HashSet.has(scope, name)),
  )

const viewReferenceOffense = (
  slot: LazySlot,
  argument: ESTree.Node,
  scopes: ReadonlyArray<HashSet.HashSet<string>>,
): Option.Option<Offense> => {
  const unwrapped = unwrapExpression(argument)
  if (isFunctionLike(unwrapped)) {
    return Option.some({
      node: argument,
      message: `Lazy slot \`${slot.name}\` must receive a stable module-scope view function, not an inline function. Define the view function at module scope and pass the identifier. (FK lazy view)`,
    })
  }
  if (!isIdentifierLike(unwrapped)) return Option.none()
  return isFunctionScopedName(unwrapped.name, scopes)
    ? Option.some({
        node: argument,
        message: `Lazy slot \`${slot.name}\` receives function-scoped view reference \`${unwrapped.name}\`. Lazy view functions must be module-scope identifiers so referential equality can hit the cache. (FK lazy view)`,
      })
    : Option.none()
}

const slotCallOffense = (
  call: ESTree.CallExpression,
  slots: ReadonlyArray<LazySlot>,
  scopes: ReadonlyArray<HashSet.HashSet<string>>,
): Option.Option<Offense> =>
  pipe(
    slotForCall(call, slots),
    Option.flatMap(slot =>
      pipe(
        viewFunctionArgument(call, slot),
        Option.flatMap(argument =>
          viewReferenceOffense(slot, argument, scopes),
        ),
      ),
    ),
  )

const slotCallOffensesIn = (
  root: unknown,
  slots: ReadonlyArray<LazySlot>,
  scopes: ReadonlyArray<HashSet.HashSet<string>>,
): ReadonlyArray<Offense> => {
  if (isFunctionLike(root)) {
    return P.isObject(root)
      ? walkChildren(root, child =>
          slotCallOffensesIn(child, slots, [
            ...scopes,
            functionScopeBindings(root),
          ]),
        )
      : []
  }
  const self = isCallExpressionNode(root)
    ? pipe(
        slotCallOffense(root, slots, scopes),
        Option.match({
          onNone: () => [],
          onSome: offense => [offense],
        }),
      )
    : []
  return P.isObject(root)
    ? [
        ...self,
        ...walkChildren(root, child =>
          slotCallOffensesIn(child, slots, scopes),
        ),
      ]
    : self
}

const analyze = (
  ctx: RuleContext['Service'],
  program: ESTree.Program,
): Effect.Effect<void, never, RuleContext> => {
  const slots = moduleLazySlots(program)
  const offenses = [
    ...createCallOffenses(program, slots),
    ...slotCallOffensesIn(program, slots, []),
  ]
  return Effect.forEach(
    offenses,
    offense =>
      ctx.report(
        Diagnostic.make({
          node: offense.node,
          message: offense.message,
        }),
      ),
    { concurrency: 1, discard: true },
  )
}

const rule: CreateRule = Rule.define({
  name: 'lazy-view-stable-references',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Require Foldkit lazy slots and lazy view functions to be stable module-scope references',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('Program:exit', node => analyze(ctx, node))
  },
})

export default rule
