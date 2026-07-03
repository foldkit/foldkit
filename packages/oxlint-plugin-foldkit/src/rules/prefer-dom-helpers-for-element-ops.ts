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

const TARGET_METHODS = HashSet.make(
  'click',
  'close',
  'focus',
  'scrollIntoView',
  'showModal',
)

const QUERY_METHODS = HashSet.make('getElementById', 'querySelector')

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const basename = (filename: string): string =>
  pipe(
    Str.split('/')(normalizedPath(filename)),
    Arr.last,
    Option.getOrElse(() => filename),
  )

const isScopedFile = (filename: string): boolean => {
  const base = basename(filename)
  return /^command.*\.tsx?$/.test(base) || /^subscription.*\.tsx?$/.test(base)
}

type IdentifierNode = ESTree.IdentifierName | ESTree.IdentifierReference

type NodeWithParent = {
  readonly type: string
  readonly parent?: unknown
}

const isNodeWithParent = (value: unknown): value is NodeWithParent =>
  P.isObject(value) && 'type' in value && P.isString(value.type)

const parentOf = (node: {
  readonly parent?: unknown
}): Option.Option<NodeWithParent> =>
  pipe(Option.fromNullishOr(node.parent), Option.filter(isNodeWithParent))

const isIdentifier = (value: unknown): value is IdentifierNode =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpression = (value: unknown): value is ESTree.MemberExpression =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isCallExpression = (value: unknown): value is ESTree.CallExpression =>
  P.isObject(value) && 'type' in value && value.type === 'CallExpression'

const isVariableDeclaration = (
  value: unknown,
): value is ESTree.VariableDeclaration =>
  P.isObject(value) && 'type' in value && value.type === 'VariableDeclaration'

const isIfStatementLike = (
  value: unknown,
): value is NodeWithParent & { readonly test: unknown } =>
  isNodeWithParent(value) && value.type === 'IfStatement' && 'test' in value

const isConditionalExpressionLike = (
  value: unknown,
): value is NodeWithParent & { readonly test: unknown } =>
  isNodeWithParent(value) &&
  value.type === 'ConditionalExpression' &&
  'test' in value

const isWhileStatementLike = (
  value: unknown,
): value is NodeWithParent & { readonly test: unknown } =>
  isNodeWithParent(value) &&
  (value.type === 'WhileStatement' || value.type === 'DoWhileStatement') &&
  'test' in value

const isUnaryExpressionLike = (
  value: unknown,
): value is NodeWithParent & {
  readonly operator: string
  readonly argument: unknown
} =>
  isNodeWithParent(value) &&
  value.type === 'UnaryExpression' &&
  'operator' in value &&
  P.isString(value.operator) &&
  'argument' in value

const isBinaryExpressionLike = (
  value: unknown,
): value is NodeWithParent & {
  readonly operator: string
  readonly left: unknown
  readonly right: unknown
} =>
  isNodeWithParent(value) &&
  value.type === 'BinaryExpression' &&
  'operator' in value &&
  P.isString(value.operator) &&
  'left' in value &&
  'right' in value

const isLogicalExpressionLike = (
  value: unknown,
): value is NodeWithParent & {
  readonly operator: string
  readonly left: unknown
  readonly right: unknown
} =>
  isNodeWithParent(value) &&
  value.type === 'LogicalExpression' &&
  'operator' in value &&
  P.isString(value.operator) &&
  'left' in value &&
  'right' in value

const isNullishLiteral = (value: unknown): boolean =>
  (P.isObject(value) &&
    'type' in value &&
    value.type === 'Literal' &&
    'value' in value &&
    value.value === null) ||
  (isIdentifier(value) && value.name === 'undefined')

const unwrapExpression = (value: unknown): unknown => {
  if (!P.isObject(value) || !('type' in value)) return value
  if (
    (value.type === 'ChainExpression' ||
      value.type === 'ParenthesizedExpression' ||
      value.type === 'TSNonNullExpression' ||
      value.type === 'TSAsExpression' ||
      value.type === 'TSSatisfiesExpression' ||
      value.type === 'TSTypeAssertion' ||
      value.type === 'TSInstantiationExpression') &&
    'expression' in value
  ) {
    return unwrapExpression(value.expression)
  }
  return value
}

const staticPropertyName = (
  member: ESTree.MemberExpression,
): Option.Option<string> =>
  member.computed
    ? Option.none()
    : isIdentifier(member.property)
      ? Option.some(member.property.name)
      : Option.none()

const rootIdentifier = (value: unknown): Option.Option<IdentifierNode> => {
  const unwrapped = unwrapExpression(value)
  if (isIdentifier(unwrapped)) return Option.some(unwrapped)
  if (isMemberExpression(unwrapped)) return rootIdentifier(unwrapped.object)
  return Option.none()
}

interface DomQueryCall {
  readonly call: ESTree.CallExpression
  readonly document: IdentifierNode
  readonly method: string
}

const domQueryCall = (value: unknown): Option.Option<DomQueryCall> => {
  const unwrapped = unwrapExpression(value)
  if (!isCallExpression(unwrapped)) return Option.none()
  const callee = unwrapExpression(unwrapped.callee)
  if (!isMemberExpression(callee)) return Option.none()
  return pipe(
    AST.memberPath(callee),
    Option.flatMap(path => {
      if (path.length !== 2 || path[0] !== 'document') {
        return Option.none()
      }
      return pipe(
        Arr.get(path, 1),
        Option.filter(method => HashSet.has(QUERY_METHODS, method)),
        Option.flatMap(method =>
          pipe(
            rootIdentifier(callee),
            Option.map(document => ({
              call: unwrapped,
              document,
              method,
            })),
          ),
        ),
      )
    }),
  )
}

interface TargetMethodCall {
  readonly member: ESTree.MemberExpression
  readonly method: string
  readonly receiver: unknown
}

const targetMethodCall = (
  call: ESTree.CallExpression,
): Option.Option<TargetMethodCall> => {
  const callee = unwrapExpression(call.callee)
  if (!isMemberExpression(callee)) return Option.none()
  return pipe(
    staticPropertyName(callee),
    Option.filter(method => HashSet.has(TARGET_METHODS, method)),
    Option.map(method => ({
      member: callee,
      method,
      receiver: unwrapExpression(callee.object),
    })),
  )
}

const directQueryTarget = (
  call: ESTree.CallExpression,
): Option.Option<DomQueryCall & { readonly method: string }> =>
  pipe(
    targetMethodCall(call),
    Option.flatMap(target =>
      pipe(
        domQueryCall(target.receiver),
        Option.map(query => ({ ...query, method: target.method })),
      ),
    ),
  )

const isCalleeOfCall = (member: ESTree.MemberExpression): boolean =>
  pipe(
    parentOf(member),
    Option.match({
      onNone: () => false,
      onSome: parent => {
        if (
          isCallExpression(parent) &&
          unwrapExpression(parent.callee) === member
        ) {
          return true
        }
        return (
          parent.type === 'ChainExpression' &&
          'expression' in parent &&
          parent.expression === member &&
          pipe(
            parentOf(parent),
            Option.match({
              onNone: () => false,
              onSome: callParent =>
                isCallExpression(callParent) &&
                unwrapExpression(callParent.callee) === parent,
            }),
          )
        )
      },
    }),
  )

const isTargetReceiverReference = (identifier: IdentifierNode): boolean =>
  pipe(
    parentOf(identifier),
    Option.match({
      onNone: () => false,
      onSome: parent => {
        if (!isMemberExpression(parent) || parent.object !== identifier) {
          return false
        }
        return pipe(
          staticPropertyName(parent),
          Option.match({
            onNone: () => false,
            onSome: method =>
              HashSet.has(TARGET_METHODS, method) && isCalleeOfCall(parent),
          }),
        )
      },
    }),
  )

const isControlTest = (value: unknown): boolean =>
  pipe(
    Option.fromNullishOr(value),
    Option.flatMap(node =>
      isNodeWithParent(node) ? parentOf(node) : Option.none(),
    ),
    Option.match({
      onNone: () => false,
      onSome: parent =>
        (isIfStatementLike(parent) && parent.test === value) ||
        (isConditionalExpressionLike(parent) && parent.test === value) ||
        (isWhileStatementLike(parent) && parent.test === value),
    }),
  )

const isNullishComparisonGuard = (
  binary: NodeWithParent & {
    readonly operator: string
    readonly left: unknown
    readonly right: unknown
  },
  identifier: IdentifierNode,
): boolean =>
  (binary.operator === '==' ||
    binary.operator === '===' ||
    binary.operator === '!=' ||
    binary.operator === '!==') &&
  ((binary.left === identifier && isNullishLiteral(binary.right)) ||
    (binary.right === identifier && isNullishLiteral(binary.left))) &&
  isControlTest(binary)

const isExistenceGuardReference = (identifier: IdentifierNode): boolean =>
  pipe(
    parentOf(identifier),
    Option.match({
      onNone: () => false,
      onSome: parent => {
        if (isControlTest(identifier)) return true
        if (
          isUnaryExpressionLike(parent) &&
          parent.operator === '!' &&
          parent.argument === identifier
        ) {
          return isControlTest(parent)
        }
        if (isBinaryExpressionLike(parent)) {
          return isNullishComparisonGuard(parent, identifier)
        }
        return (
          isLogicalExpressionLike(parent) &&
          parent.operator === '&&' &&
          parent.left === identifier
        )
      },
    }),
  )

type ReferenceUse = 'guard' | 'other' | 'target'

const referenceUse = (identifier: IdentifierNode): ReferenceUse => {
  if (isTargetReceiverReference(identifier)) return 'target'
  if (isExistenceGuardReference(identifier)) return 'guard'
  return 'other'
}

const shouldReportQueryVariable = (
  references: ReadonlyArray<{
    readonly identifier: unknown
    readonly init: boolean
  }>,
): boolean => {
  const uses = pipe(
    references,
    Arr.filter(reference => !reference.init),
    Arr.map(reference =>
      isIdentifier(reference.identifier)
        ? referenceUse(reference.identifier)
        : 'other',
    ),
  )
  return (
    pipe(
      uses,
      Arr.some(use => use === 'target'),
    ) &&
    pipe(
      uses,
      Arr.every(use => use === 'target' || use === 'guard'),
    )
  )
}

const constQueryVariable = (
  node: ESTree.VariableDeclarator,
): Option.Option<{ readonly name: string; readonly query: DomQueryCall }> => {
  const id = node.id
  if (!isIdentifier(id)) return Option.none()
  return pipe(
    domQueryCall(node.init),
    Option.map(query => ({ name: id.name, query })),
  )
}

const reportDirectMethod = (
  ctx: RuleContext['Service'],
  node: ESTree.CallExpression,
  method: string,
): Effect.Effect<void> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Use Foldkit \`Dom\` helpers instead of calling \`${method}\` directly on a \`document.getElementById/querySelector\` result. Dom helpers wait for the next render commit and report typed missing-element failures. (FK Dom)`,
    }),
  )

const reportQueryVariable = (
  ctx: RuleContext['Service'],
  node: ESTree.VariableDeclarator,
  name: string,
  queryMethod: string,
): Effect.Effect<void> =>
  ctx.report(
    Diagnostic.make({
      node,
      message: `Variable \`${name}\` is initialized from \`document.${queryMethod}(...)\` and only used to call DOM element methods. Use Foldkit \`Dom\` helpers instead so the operation runs after render commit and fails in the typed channel. (FK Dom)`,
    }),
  )

const analyzeQueryVariable = (
  ctx: RuleContext['Service'],
  node: ESTree.VariableDeclarator,
  name: string,
  query: DomQueryCall,
): Effect.Effect<void, never, RuleContext> =>
  SourceCode.getDeclaredVariables(node).pipe(
    Effect.flatMap(variables =>
      pipe(
        variables,
        Arr.findFirst(variable => variable.name === name),
        Option.match({
          onNone: () => Effect.void,
          onSome: variable =>
            shouldReportQueryVariable(variable.references)
              ? reportQueryVariable(ctx, node, name, query.method)
              : Effect.void,
        }),
      ),
    ),
  )

const rule: CreateRule = Rule.define({
  name: 'prefer-dom-helpers-for-element-ops',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Prefer Foldkit Dom helpers over direct focus, scroll, click, and dialog operations on queried elements',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.filter(
      isScopedFile,
      Visitor.merge(
        Visitor.on('CallExpression', node =>
          pipe(
            directQueryTarget(node),
            Option.match({
              onNone: () => Effect.void,
              onSome: ({ document, method }) =>
                SourceCode.isGlobalReference(document).pipe(
                  Effect.flatMap(isGlobal =>
                    isGlobal
                      ? reportDirectMethod(ctx, node, method)
                      : Effect.void,
                  ),
                ),
            }),
          ),
        ),
        Visitor.on('VariableDeclarator', node =>
          pipe(
            constQueryVariable(node),
            Option.match({
              onNone: () => Effect.void,
              onSome: ({ name, query }) =>
                pipe(
                  parentOf(node),
                  Option.filter(
                    parent =>
                      isVariableDeclaration(parent) && parent.kind === 'const',
                  ),
                  Option.match({
                    onNone: () => Effect.void,
                    onSome: () =>
                      SourceCode.isGlobalReference(query.document).pipe(
                        Effect.flatMap(isGlobal =>
                          isGlobal
                            ? analyzeQueryVariable(ctx, node, name, query)
                            : Effect.void,
                        ),
                      ),
                  }),
                ),
            }),
          ),
        ),
      ),
    )
  },
})

export default rule
