import { Array, Effect, Option, String, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  SourceCode,
  Visitor,
} from 'effect-oxlint'

const COMMAND_FILE_PATTERN = /^command.*\.tsx?$/
const SUBSCRIPTION_FILE_PATTERN = /^subscription.*\.tsx?$/

const QUERY_METHODS: ReadonlyArray<string> = ['getElementById', 'querySelector']

type TargetMethod = 'click' | 'close' | 'focus' | 'scrollIntoView' | 'showModal'

const DOM_HELPER_BY_TARGET_METHOD: Readonly<Record<TargetMethod, string>> = {
  click: 'Dom.clickElement',
  close: 'Dom.closeDialog',
  focus: 'Dom.focus',
  scrollIntoView: 'Dom.scrollIntoView',
  showModal: 'Dom.showDialog',
}

const isTargetMethod = (name: string): name is TargetMethod =>
  name in DOM_HELPER_BY_TARGET_METHOD

const basenameOf = (filename: string): string =>
  pipe(
    filename,
    String.replaceAll('\\', '/'),
    String.split('/'),
    Array.lastNonEmpty,
  )

const isCommandOrSubscriptionFile = (filename: string): boolean => {
  const basename = basenameOf(filename)
  return (
    COMMAND_FILE_PATTERN.test(basename) ||
    SUBSCRIPTION_FILE_PATTERN.test(basename)
  )
}

type WrapperExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const WRAPPER_EXPRESSION_TYPES: ReadonlyArray<string> = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]

const isWrapperExpression = (node: ESTree.Node): node is WrapperExpression =>
  WRAPPER_EXPRESSION_TYPES.includes(node.type)

const unwrapExpression = (node: ESTree.Node): ESTree.Node =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

const isConstDeclaration = (node: ESTree.Node | null): boolean =>
  node !== null && node.type === 'VariableDeclaration' && node.kind === 'const'

type DomQuery = Readonly<{
  documentIdentifier: ESTree.Node
  queryMethod: string
}>

const matchDomQueryCall = (node: ESTree.Node): Option.Option<DomQuery> => {
  const unwrapped = unwrapExpression(node)
  if (unwrapped.type !== 'CallExpression') {
    return Option.none()
  }
  const callee = unwrapped.callee
  if (callee.type !== 'MemberExpression') {
    return Option.none()
  }
  return pipe(
    AST.matchMember(callee, 'document', QUERY_METHODS),
    Option.map(member => ({
      documentIdentifier: member.object,
      queryMethod: member.property.name,
    })),
  )
}

const isTargetUse = (identifier: ESTree.Node): boolean => {
  const memberCandidate = identifier.parent
  if (
    memberCandidate === null ||
    memberCandidate.type !== 'MemberExpression' ||
    memberCandidate.computed ||
    memberCandidate.object !== identifier ||
    memberCandidate.property.type !== 'Identifier' ||
    !isTargetMethod(memberCandidate.property.name)
  ) {
    return false
  }
  const callCandidate = memberCandidate.parent
  if (callCandidate === null) {
    return false
  }
  if (callCandidate.type === 'CallExpression') {
    return unwrapExpression(callCandidate.callee) === memberCandidate
  }
  if (
    callCandidate.type === 'ChainExpression' &&
    callCandidate.expression === memberCandidate
  ) {
    const chainParent = callCandidate.parent
    if (chainParent === null || chainParent.type !== 'CallExpression') {
      return false
    }
    const unwrappedCallee = unwrapExpression(chainParent.callee)
    return (
      unwrappedCallee === callCandidate || unwrappedCallee === memberCandidate
    )
  }
  return false
}

const GUARD_TEST_CONTAINER_TYPES: ReadonlyArray<string> = [
  'ConditionalExpression',
  'DoWhileStatement',
  'IfStatement',
  'WhileStatement',
]

const isTestOf = (
  container: ESTree.Node | null,
  candidate: ESTree.Node,
): boolean =>
  container !== null &&
  GUARD_TEST_CONTAINER_TYPES.includes(container.type) &&
  'test' in container &&
  container.test === candidate

const NULL_COMPARISON_OPERATORS: ReadonlyArray<string> = [
  '==',
  '===',
  '!=',
  '!==',
]

const isNullOrUndefinedExpression = (node: ESTree.Node): boolean => {
  if (node.type === 'Identifier') {
    return node.name === 'undefined'
  }
  return node.type === 'Literal' && node.value === null
}

const isGuardUse = (identifier: ESTree.Node): boolean => {
  const parent = identifier.parent
  if (parent === null) {
    return false
  }
  if (isTestOf(parent, identifier)) {
    return true
  }
  if (
    parent.type === 'UnaryExpression' &&
    parent.operator === '!' &&
    parent.argument === identifier
  ) {
    return isTestOf(parent.parent, parent)
  }
  if (parent.type === 'BinaryExpression') {
    const comparesAgainstNullish =
      NULL_COMPARISON_OPERATORS.includes(parent.operator) &&
      ((parent.left === identifier &&
        isNullOrUndefinedExpression(parent.right)) ||
        (parent.right === identifier &&
          isNullOrUndefinedExpression(parent.left)))
    return comparesAgainstNullish && isTestOf(parent.parent, parent)
  }
  return (
    parent.type === 'LogicalExpression' &&
    parent.operator === '&&' &&
    parent.left === identifier
  )
}

const directChainMessage = (
  targetMethod: TargetMethod,
  queryMethod: string,
): string =>
  `Calling \`${targetMethod}\` on a raw \`document.${queryMethod}(...)\` result races the render commit and throws untyped errors when the element is missing. Use \`${DOM_HELPER_BY_TARGET_METHOD[targetMethod]}\` instead. It runs after the commit and fails with a typed \`ElementNotFound\` in the Command error channel.`

const queryVariableMessage = (
  variableName: string,
  queryMethod: string,
): string =>
  `\`${variableName}\` is assigned from \`document.${queryMethod}(...)\` and only used to call element methods. Replace the query and the calls with the matching Foldkit \`Dom\` helper so the operation runs after the render commit and missing elements fail with a typed \`ElementNotFound\`.`

/**
 * Flags imperative DOM element operations on raw `document.getElementById`
 * and `document.querySelector` results in Command and Subscription files,
 * where the Foldkit `Dom` helpers wait for the render commit and fail with
 * a typed `ElementNotFound` instead.
 */
export const preferDomHelpersForElementOps = Rule.define({
  name: 'prefer-dom-helpers-for-element-ops',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Use Foldkit Dom helpers instead of imperative element operations on raw document query results.',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    const checkDirectChainedCall = (node: ESTree.CallExpression) =>
      Effect.gen(function* () {
        const callee = unwrapExpression(node.callee)
        if (callee.type !== 'MemberExpression' || callee.computed) {
          return
        }
        if (
          callee.property.type !== 'Identifier' ||
          !isTargetMethod(callee.property.name)
        ) {
          return
        }
        const targetMethod = callee.property.name
        const maybeQuery = matchDomQueryCall(callee.object)
        if (Option.isNone(maybeQuery)) {
          return
        }
        const isGlobalDocument = yield* SourceCode.isGlobalReference(
          maybeQuery.value.documentIdentifier,
        )
        if (!isGlobalDocument) {
          return
        }
        yield* ctx.report(
          Diagnostic.make({
            node,
            message: directChainMessage(
              targetMethod,
              maybeQuery.value.queryMethod,
            ),
          }),
        )
      })

    const checkQueryVariableDeclarator = (node: ESTree.VariableDeclarator) =>
      Effect.gen(function* () {
        if (node.id.type !== 'Identifier' || node.init === null) {
          return
        }
        const variableName = node.id.name
        const maybeQuery = matchDomQueryCall(node.init)
        if (Option.isNone(maybeQuery)) {
          return
        }
        if (!isConstDeclaration(node.parent)) {
          return
        }
        const isGlobalDocument = yield* SourceCode.isGlobalReference(
          maybeQuery.value.documentIdentifier,
        )
        if (!isGlobalDocument) {
          return
        }
        const declaredVariables = yield* SourceCode.getDeclaredVariables(node)
        const maybeVariable = Array.findFirst(
          declaredVariables,
          variable => variable.name === variableName,
        )
        if (Option.isNone(maybeVariable)) {
          return
        }
        const usageReferences = pipe(
          maybeVariable.value.references,
          Array.filter(reference => !reference.init),
        )
        const isOnlyElementOperationUsage =
          usageReferences.some(reference =>
            isTargetUse(reference.identifier),
          ) &&
          usageReferences.every(
            reference =>
              isTargetUse(reference.identifier) ||
              isGuardUse(reference.identifier),
          )
        if (!isOnlyElementOperationUsage) {
          return
        }
        yield* ctx.report(
          Diagnostic.make({
            node,
            message: queryVariableMessage(
              variableName,
              maybeQuery.value.queryMethod,
            ),
          }),
        )
      })

    return yield* Visitor.filter(isCommandOrSubscriptionFile, {
      CallExpression: (node: ESTree.Node) =>
        isCallExpression(node) ? checkDirectChainedCall(node) : Effect.void,
      VariableDeclarator: (node: ESTree.Node) =>
        isVariableDeclarator(node)
          ? checkQueryVariableDeclarator(node)
          : Effect.void,
    })
  },
})
