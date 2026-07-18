import MagicString, { type SourceMap } from 'magic-string'
import { relative, sep } from 'node:path'
import { type Plugin, parseAst } from 'vite'

const HTML_MODULE_SPECIFIER = 'foldkit/html'
const HTML_EXPORT_NAME = 'html'

const NON_ELEMENT_FACTORY_MEMBERS: ReadonlySet<string> = new Set([
  'keyed',
  'empty',
  'submodel',
])

const MATCH_OBJECT_HANDLER_NAMES: ReadonlySet<string> = new Set([
  'match',
  'tags',
  'tagsExhaustive',
])

const MATCH_POSITIONAL_HANDLER_NAMES: ReadonlySet<string> = new Set([
  'when',
  'whenOr',
  'tag',
  'tagStartsWith',
  'orElse',
])

const COLLECTION_MAP_NAMES: ReadonlySet<string> = new Set([
  'map',
  'flatMap',
  'filterMap',
  'makeBy',
  'replicate',
])

const SINGLE_VALUE_NAMESPACES: ReadonlySet<string> = new Set([
  'Option',
  'Effect',
  'Stream',
  'Result',
  'Either',
  'Exit',
  'Fiber',
  'STM',
  'Match',
])

const LOWERCASE_START_PATTERN = /^[a-z]/
const SCRIPT_FILE_PATTERN = /\.(?:ts|tsx|js|jsx|mts|mjs)$/

const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const SITE_ID_RADIX = 36

// AST

interface AstNode {
  readonly type: string
  readonly start: number
  readonly end: number
  readonly [field: string]: unknown
}

interface IdentifierNode extends AstNode {
  readonly type: 'Identifier'
  readonly name: string
}

interface LiteralNode extends AstNode {
  readonly type: 'Literal'
  readonly value: unknown
}

interface MemberExpressionNode extends AstNode {
  readonly type: 'MemberExpression'
  readonly object: AstNode
  readonly property: AstNode
  readonly computed: boolean
}

interface CallExpressionNode extends AstNode {
  readonly type: 'CallExpression'
  readonly callee: AstNode
  readonly arguments: ReadonlyArray<AstNode>
}

interface DirectElementCallNode extends CallExpressionNode {
  readonly callee: MemberExpressionNode
}

interface ArrayExpressionNode extends AstNode {
  readonly type: 'ArrayExpression'
  readonly elements: ReadonlyArray<AstNode | null>
}

interface ConditionalExpressionNode extends AstNode {
  readonly type: 'ConditionalExpression'
  readonly consequent: AstNode
  readonly alternate: AstNode
}

interface ObjectExpressionNode extends AstNode {
  readonly type: 'ObjectExpression'
  readonly properties: ReadonlyArray<AstNode>
}

interface PropertyNode extends AstNode {
  readonly type: 'Property'
  readonly key: AstNode
  readonly value: AstNode
  readonly computed: boolean
}

interface FunctionNode extends AstNode {
  readonly body: AstNode
}

interface ReturnStatementNode extends AstNode {
  readonly type: 'ReturnStatement'
  readonly argument: AstNode | null
}

interface ImportDeclarationNode extends AstNode {
  readonly type: 'ImportDeclaration'
  readonly source: AstNode
  readonly specifiers: ReadonlyArray<AstNode>
}

interface ImportSpecifierNode extends AstNode {
  readonly type: 'ImportSpecifier'
  readonly imported: AstNode
  readonly local: AstNode
}

interface VariableDeclaratorNode extends AstNode {
  readonly type: 'VariableDeclarator'
  readonly id: AstNode
  readonly init: AstNode | null
}

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isIdentifier = (node: AstNode): node is IdentifierNode =>
  node.type === 'Identifier'

const isLiteral = (node: AstNode): node is LiteralNode =>
  node.type === 'Literal'

const isMemberExpression = (node: AstNode): node is MemberExpressionNode =>
  node.type === 'MemberExpression'

const isCallExpression = (node: AstNode): node is CallExpressionNode =>
  node.type === 'CallExpression'

const isArrayExpression = (node: AstNode): node is ArrayExpressionNode =>
  node.type === 'ArrayExpression'

const isConditionalExpression = (
  node: AstNode,
): node is ConditionalExpressionNode => node.type === 'ConditionalExpression'

const isObjectExpression = (node: AstNode): node is ObjectExpressionNode =>
  node.type === 'ObjectExpression'

const isProperty = (node: AstNode): node is PropertyNode =>
  node.type === 'Property'

const FUNCTION_NODE_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
])

const isFunctionNode = (node: AstNode): node is FunctionNode =>
  FUNCTION_NODE_TYPES.has(node.type)

const isReturnStatement = (node: AstNode): node is ReturnStatementNode =>
  node.type === 'ReturnStatement'

const isImportDeclaration = (node: AstNode): node is ImportDeclarationNode =>
  node.type === 'ImportDeclaration'

const isImportSpecifier = (node: AstNode): node is ImportSpecifierNode =>
  node.type === 'ImportSpecifier'

const isVariableDeclarator = (node: AstNode): node is VariableDeclaratorNode =>
  node.type === 'VariableDeclarator'

const walkChildNodes = (
  node: AstNode,
  visitChild: (child: AstNode) => void,
): void => {
  for (const [fieldName, fieldValue] of Object.entries(node)) {
    if (fieldName === 'parent') {
      continue
    }
    if (isAstNode(fieldValue)) {
      visitChild(fieldValue)
    } else if (Array.isArray(fieldValue)) {
      for (const element of fieldValue) {
        if (isAstNode(element)) {
          visitChild(element)
        }
      }
    }
  }
}

const walkNodeTree = (root: AstNode, visit: (node: AstNode) => void): void => {
  visit(root)
  walkChildNodes(root, child => {
    walkNodeTree(child, visit)
  })
}

const parseProgram = (code: string): AstNode | null => {
  try {
    const program: unknown = parseAst(code)
    if (isAstNode(program)) {
      return program
    }
    return null
  } catch {
    return null
  }
}

// BINDINGS

const importedSpecifierName = (
  specifier: ImportSpecifierNode,
): string | undefined => {
  if (isIdentifier(specifier.imported)) {
    return specifier.imported.name
  }
  if (
    isLiteral(specifier.imported) &&
    typeof specifier.imported.value === 'string'
  ) {
    return specifier.imported.value
  }
  return undefined
}

const collectFactoryBindingNames = (program: AstNode): ReadonlySet<string> => {
  const htmlImportLocalNames = new Set<string>()
  const boundNamesByCalleeName = new Map<string, Array<string>>()

  walkNodeTree(program, node => {
    if (
      isImportDeclaration(node) &&
      isLiteral(node.source) &&
      node.source.value === HTML_MODULE_SPECIFIER
    ) {
      for (const specifier of node.specifiers) {
        if (
          isImportSpecifier(specifier) &&
          importedSpecifierName(specifier) === HTML_EXPORT_NAME &&
          isIdentifier(specifier.local)
        ) {
          htmlImportLocalNames.add(specifier.local.name)
        }
      }
    }
    if (
      isVariableDeclarator(node) &&
      isIdentifier(node.id) &&
      node.init !== null &&
      node.init !== undefined &&
      isCallExpression(node.init) &&
      isIdentifier(node.init.callee)
    ) {
      const calleeName = node.init.callee.name
      const boundNames = boundNamesByCalleeName.get(calleeName) ?? []
      boundNames.push(node.id.name)
      boundNamesByCalleeName.set(calleeName, boundNames)
    }
  })

  const factoryBindingNames = new Set<string>()
  for (const localName of htmlImportLocalNames) {
    for (const boundName of boundNamesByCalleeName.get(localName) ?? []) {
      factoryBindingNames.add(boundName)
    }
  }
  return factoryBindingNames
}

// TARGETS

const callHandlerName = (call: CallExpressionNode): string | undefined => {
  if (isIdentifier(call.callee)) {
    return call.callee.name
  }
  if (
    isMemberExpression(call.callee) &&
    !call.callee.computed &&
    isIdentifier(call.callee.property)
  ) {
    return call.callee.property.name
  }
  return undefined
}

const isMatchFamilyName = (handlerName: string): boolean =>
  MATCH_OBJECT_HANDLER_NAMES.has(handlerName) ||
  MATCH_POSITIONAL_HANDLER_NAMES.has(handlerName)

const handlerResultExpressions = (
  handlerFunction: FunctionNode,
): Array<AstNode> => {
  if (handlerFunction.body.type !== 'BlockStatement') {
    return [handlerFunction.body]
  }
  const results: Array<AstNode> = []
  const collectFromStatement = (node: AstNode): void => {
    if (isFunctionNode(node)) {
      return
    }
    if (isReturnStatement(node)) {
      if (node.argument !== null && node.argument !== undefined) {
        results.push(node.argument)
      }
      return
    }
    walkChildNodes(node, collectFromStatement)
  }
  walkChildNodes(handlerFunction.body, collectFromStatement)
  return results
}

type ReturnClassification = Readonly<{
  ifNestedTargets: Array<DirectElementCallNode>
  topLevelTargets: Array<DirectElementCallNode>
}>

type TargetCollection = Readonly<{
  targetCalls: ReadonlyArray<DirectElementCallNode>
  parentByNode: ReadonlyMap<AstNode, AstNode>
}>

const collectBranchArmTargets = (
  program: AstNode,
  isDirectElement: (node: AstNode) => node is DirectElementCallNode,
): TargetCollection => {
  const targetCalls = new Set<DirectElementCallNode>()
  const parentByNode = new Map<AstNode, AstNode>()
  const returnClassificationsByFunction = new Map<
    AstNode,
    ReturnClassification
  >()

  const addArmTarget = (arm: AstNode): void => {
    if (isDirectElement(arm)) {
      targetCalls.add(arm)
      return
    }
    if (isArrayExpression(arm)) {
      for (const element of arm.elements) {
        if (
          element !== null &&
          isAstNode(element) &&
          isDirectElement(element)
        ) {
          targetCalls.add(element)
        }
      }
    }
  }

  const addMatchHandlerTargets = (call: CallExpressionNode): void => {
    const handlerName = callHandlerName(call)
    if (handlerName === undefined) {
      return
    }
    if (MATCH_OBJECT_HANDLER_NAMES.has(handlerName)) {
      for (const argument of call.arguments) {
        if (!isObjectExpression(argument)) {
          continue
        }
        for (const property of argument.properties) {
          if (
            isProperty(property) &&
            !property.computed &&
            isFunctionNode(property.value)
          ) {
            for (const result of handlerResultExpressions(property.value)) {
              addArmTarget(result)
            }
          }
        }
      }
    }
    if (MATCH_POSITIONAL_HANDLER_NAMES.has(handlerName)) {
      for (const argument of call.arguments) {
        if (isFunctionNode(argument)) {
          for (const result of handlerResultExpressions(argument)) {
            addArmTarget(result)
          }
        }
      }
    }
  }

  const classifyReturnTarget = (returnStatement: ReturnStatementNode): void => {
    const argument = returnStatement.argument
    if (
      argument === null ||
      argument === undefined ||
      !isDirectElement(argument)
    ) {
      return
    }
    let isInsideIfStatement = false
    let ancestor = parentByNode.get(returnStatement)
    while (ancestor !== undefined && !isFunctionNode(ancestor)) {
      if (ancestor.type === 'IfStatement') {
        isInsideIfStatement = true
      }
      ancestor = parentByNode.get(ancestor)
    }
    if (ancestor === undefined) {
      return
    }
    const classification = returnClassificationsByFunction.get(ancestor) ?? {
      ifNestedTargets: [],
      topLevelTargets: [],
    }
    if (isInsideIfStatement) {
      classification.ifNestedTargets.push(argument)
    } else {
      classification.topLevelTargets.push(argument)
    }
    returnClassificationsByFunction.set(ancestor, classification)
  }

  const visitNode = (node: AstNode): void => {
    if (isConditionalExpression(node)) {
      addArmTarget(node.consequent)
      addArmTarget(node.alternate)
    }
    if (isCallExpression(node)) {
      addMatchHandlerTargets(node)
    }
    if (isReturnStatement(node)) {
      classifyReturnTarget(node)
    }
    walkChildNodes(node, child => {
      parentByNode.set(child, node)
      visitNode(child)
    })
  }
  visitNode(program)

  for (const classification of returnClassificationsByFunction.values()) {
    if (classification.ifNestedTargets.length === 0) {
      continue
    }
    for (const target of classification.ifNestedTargets) {
      targetCalls.add(target)
    }
    for (const target of classification.topLevelTargets) {
      targetCalls.add(target)
    }
  }

  return { targetCalls: [...targetCalls], parentByNode }
}

// GUARDS

const isKeyCall = (node: AstNode): boolean => {
  if (!isCallExpression(node)) {
    return false
  }
  if (isIdentifier(node.callee) && node.callee.name === 'Key') {
    return true
  }
  return (
    isMemberExpression(node.callee) &&
    !node.callee.computed &&
    isIdentifier(node.callee.property) &&
    node.callee.property.name === 'Key'
  )
}

const hasExplicitKey = (attributesArgument: AstNode): boolean =>
  isArrayExpression(attributesArgument) &&
  attributesArgument.elements.some(
    element => element !== null && isAstNode(element) && isKeyCall(element),
  )

type FunctionPositionVerdict =
  | Readonly<{ kind: 'ContinueFromCall'; call: CallExpressionNode }>
  | Readonly<{ kind: 'SkipTarget' }>
  | Readonly<{ kind: 'Inject' }>

const isSingleValueNamespaceMember = (callee: AstNode): boolean =>
  isMemberExpression(callee) &&
  !callee.computed &&
  isIdentifier(callee.object) &&
  SINGLE_VALUE_NAMESPACES.has(callee.object.name)

const classifyEnclosingCall = (
  call: CallExpressionNode,
): FunctionPositionVerdict => {
  const handlerName = callHandlerName(call)
  if (handlerName === undefined) {
    return { kind: 'Inject' }
  }
  if (isMatchFamilyName(handlerName)) {
    return { kind: 'ContinueFromCall', call }
  }
  if (COLLECTION_MAP_NAMES.has(handlerName)) {
    if (isSingleValueNamespaceMember(call.callee)) {
      return { kind: 'ContinueFromCall', call }
    }
    return { kind: 'SkipTarget' }
  }
  return { kind: 'Inject' }
}

const classifyFunctionPosition = (
  handlerFunction: AstNode,
  parentByNode: ReadonlyMap<AstNode, AstNode>,
): FunctionPositionVerdict => {
  const parent = parentByNode.get(handlerFunction)
  if (parent === undefined) {
    return { kind: 'Inject' }
  }
  if (isCallExpression(parent) && parent.arguments.includes(handlerFunction)) {
    return classifyEnclosingCall(parent)
  }
  if (isProperty(parent) && parent.value === handlerFunction) {
    const objectExpression = parentByNode.get(parent)
    if (
      objectExpression === undefined ||
      !isObjectExpression(objectExpression)
    ) {
      return { kind: 'Inject' }
    }
    const enclosingCall = parentByNode.get(objectExpression)
    if (
      enclosingCall !== undefined &&
      isCallExpression(enclosingCall) &&
      enclosingCall.arguments.includes(objectExpression)
    ) {
      const handlerName = callHandlerName(enclosingCall)
      if (handlerName !== undefined && isMatchFamilyName(handlerName)) {
        return { kind: 'ContinueFromCall', call: enclosingCall }
      }
    }
  }
  return { kind: 'Inject' }
}

const isSafeInjectionContext = (
  target: AstNode,
  parentByNode: ReadonlyMap<AstNode, AstNode>,
  isDirectElement: (node: AstNode) => node is DirectElementCallNode,
): boolean => {
  let child: AstNode = target
  let current = parentByNode.get(child)
  while (current !== undefined) {
    if (
      isCallExpression(current) &&
      current.arguments.includes(child) &&
      isDirectElement(current)
    ) {
      return true
    }
    if (isFunctionNode(current)) {
      const verdict = classifyFunctionPosition(current, parentByNode)
      if (verdict.kind === 'SkipTarget') {
        return false
      }
      if (verdict.kind === 'Inject') {
        return true
      }
      child = verdict.call
      current = parentByNode.get(child)
      continue
    }
    child = current
    current = parentByNode.get(child)
  }
  return true
}

const shouldInjectKey = (
  target: DirectElementCallNode,
  parentByNode: ReadonlyMap<AstNode, AstNode>,
  isDirectElement: (node: AstNode) => node is DirectElementCallNode,
): boolean => {
  const firstArgument = target.arguments.at(0)
  if (firstArgument !== undefined) {
    if (firstArgument.type === 'SpreadElement') {
      return false
    }
    if (hasExplicitKey(firstArgument)) {
      return false
    }
  }
  return isSafeInjectionContext(target, parentByNode, isDirectElement)
}

// INJECTION

const hashModulePath = (modulePath: string): string => {
  let hash = FNV_OFFSET_BASIS
  for (let index = 0; index < modulePath.length; index += 1) {
    hash ^= modulePath.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return (hash >>> 0).toString(SITE_ID_RADIX)
}

const stripQuery = (id: string): string => {
  const [pathWithoutQuery] = id.split('?')
  return pathWithoutQuery ?? id
}

const toPosixPath = (filePath: string): string => filePath.split(sep).join('/')

const injectKey = (
  sourceText: MagicString,
  code: string,
  target: DirectElementCallNode,
  siteId: string,
): void => {
  const factoryText = code.slice(
    target.callee.object.start,
    target.callee.object.end,
  )
  const keyExpression = `${factoryText}.Key('${siteId}')`
  const firstArgument = target.arguments.at(0)
  if (firstArgument === undefined) {
    sourceText.overwrite(target.callee.end, target.end, `([${keyExpression}])`)
    return
  }
  if (isArrayExpression(firstArgument)) {
    if (firstArgument.elements.length === 0) {
      sourceText.appendLeft(firstArgument.start + 1, keyExpression)
    } else {
      sourceText.appendLeft(firstArgument.start + 1, `${keyExpression}, `)
    }
    return
  }
  sourceText.appendLeft(firstArgument.start, `[${keyExpression}, ...(`)
  sourceText.appendRight(firstArgument.end, ')]')
}

// TRANSFORM

/** Result of {@link transformBranchKeys}: rewritten code plus a source map. */
export type BranchKeysTransformResult = Readonly<{
  code: string
  map: SourceMap
}>

/**
 * Injects call-site `Key` attributes onto conditional view arms so that
 * switching branches replaces the subtree instead of patching it in place.
 *
 * Covered arm positions: ternary arms (including the conditional-insert
 * idiom of singleton-array arms), Match-family handler results (`match`,
 * `tags`, `tagsExhaustive`, `when`, `whenOr`, `tag`, `tagStartsWith`,
 * `orElse`), and if/else chains of `return` statements inside a function.
 * Only arms that construct an element directly through a binding of the
 * `html` factory from `foldkit/html` are keyed.
 *
 * Injected keys are prepended to the arm's attributes array, and Foldkit
 * processes attributes in order with a later `Key` overwriting an earlier
 * one, so an explicit `h.Key` or `h.keyed` always wins. Arms inside mapped
 * collection callbacks are skipped so mapped siblings never share an
 * injected key.
 *
 * Returns `null` when the module needs no changes.
 */
export const transformBranchKeys = (
  code: string,
  id: string,
  root: string,
): BranchKeysTransformResult | null => {
  const program = parseProgram(code)
  if (program === null) {
    return null
  }
  const factoryBindingNames = collectFactoryBindingNames(program)
  if (factoryBindingNames.size === 0) {
    return null
  }

  const isDirectElement = (node: AstNode): node is DirectElementCallNode => {
    if (!isCallExpression(node)) {
      return false
    }
    const callee = node.callee
    if (!isMemberExpression(callee) || callee.computed) {
      return false
    }
    if (!isIdentifier(callee.object) || !isIdentifier(callee.property)) {
      return false
    }
    if (!factoryBindingNames.has(callee.object.name)) {
      return false
    }
    const memberName = callee.property.name
    return (
      LOWERCASE_START_PATTERN.test(memberName) &&
      !NON_ELEMENT_FACTORY_MEMBERS.has(memberName)
    )
  }

  const { targetCalls, parentByNode } = collectBranchArmTargets(
    program,
    isDirectElement,
  )

  const sourceText = new MagicString(code)
  const moduleHash = hashModulePath(toPosixPath(relative(root, stripQuery(id))))
  const orderedTargets = [...targetCalls].sort(
    (first, second) => first.start - second.start,
  )

  let injectedSiteCount = 0
  for (const target of orderedTargets) {
    if (!shouldInjectKey(target, parentByNode, isDirectElement)) {
      continue
    }
    injectKey(sourceText, code, target, `fk-${moduleHash}-${injectedSiteCount}`)
    injectedSiteCount += 1
  }
  if (injectedSiteCount === 0) {
    return null
  }
  return {
    code: sourceText.toString(),
    map: sourceText.generateMap({ hires: 'boundary' }),
  }
}

// PLUGIN

/**
 * Vite plugin that applies {@link transformBranchKeys} to application
 * modules in both dev and build. Skips `node_modules`, non-script files,
 * and modules that never mention `foldkit/html`.
 */
export const foldkitBranchKeys = (): Plugin => {
  let resolvedRoot = process.cwd()
  return {
    name: 'foldkit:branch-keys',
    configResolved: config => {
      resolvedRoot = config.root
    },
    transform: (code, id) => {
      if (id.includes('node_modules')) {
        return null
      }
      if (!SCRIPT_FILE_PATTERN.test(stripQuery(id))) {
        return null
      }
      if (!code.includes(HTML_MODULE_SPECIFIER)) {
        return null
      }
      return transformBranchKeys(code, id, resolvedRoot)
    },
  }
}
