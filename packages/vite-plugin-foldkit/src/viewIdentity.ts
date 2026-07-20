import MagicString, { type SourceMap } from 'magic-string'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, resolve, sep } from 'node:path'
import { type Plugin, parseAst } from 'vite'

const BRAND_MODULE_SPECIFIER = 'foldkit/brand'
const BRAND_EXPORT_NAME = 'brandViewResult'
const BRAND_IMPORT_ALIAS = '__foldkitBrandViewResult'
const FIRST_ALIAS_SUFFIX = 2
const FIRST_DUPLICATE_NAME_SUFFIX = 2
const DEFAULT_EXPORT_FUNCTION_NAME = 'default'
const ANONYMOUS_FUNCTION_NAME = 'anonymous'
const FOLDKIT_PACKAGE_NAME = 'foldkit'
const FOLDKIT_CORE_PATH_FRAGMENT = 'packages/foldkit/'
const VIRTUAL_MODULE_PREFIX = '\0'
const SCRIPT_FILE_PATTERN = /\.(?:ts|tsx|js|jsx|mts|mjs)$/

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

interface PrivateIdentifierNode extends AstNode {
  readonly type: 'PrivateIdentifier'
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

interface AssignmentExpressionNode extends AstNode {
  readonly type: 'AssignmentExpression'
  readonly left: AstNode
  readonly right: AstNode
}

interface FunctionNode extends AstNode {
  readonly body: AstNode
  readonly id?: AstNode | null
}

interface ReturnStatementNode extends AstNode {
  readonly type: 'ReturnStatement'
  readonly argument: AstNode | null
}

interface VariableDeclaratorNode extends AstNode {
  readonly type: 'VariableDeclarator'
  readonly id: AstNode
  readonly init: AstNode | null
}

interface NamedValueNode extends AstNode {
  readonly key: AstNode
  readonly value: AstNode
  readonly computed: boolean
}

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isIdentifier = (node: AstNode): node is IdentifierNode =>
  node.type === 'Identifier'

const isPrivateIdentifier = (node: AstNode): node is PrivateIdentifierNode =>
  node.type === 'PrivateIdentifier'

const isLiteral = (node: AstNode): node is LiteralNode =>
  node.type === 'Literal'

const isMemberExpression = (node: AstNode): node is MemberExpressionNode =>
  node.type === 'MemberExpression'

const isAssignmentExpression = (
  node: AstNode,
): node is AssignmentExpressionNode => node.type === 'AssignmentExpression'

const FUNCTION_NODE_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
])

const isFunctionNode = (node: AstNode): node is FunctionNode =>
  FUNCTION_NODE_TYPES.has(node.type)

const isReturnStatement = (node: AstNode): node is ReturnStatementNode =>
  node.type === 'ReturnStatement'

const isVariableDeclarator = (node: AstNode): node is VariableDeclaratorNode =>
  node.type === 'VariableDeclarator'

const NAMED_VALUE_NODE_TYPES: ReadonlySet<string> = new Set([
  'Property',
  'MethodDefinition',
  'PropertyDefinition',
])

const isNamedValueNode = (node: AstNode): node is NamedValueNode =>
  NAMED_VALUE_NODE_TYPES.has(node.type) &&
  isAstNode(node['key']) &&
  isAstNode(node['value'])

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

// ELIGIBILITY

const stripQuery = (id: string): string => {
  const [pathWithoutQuery] = id.split('?')
  return pathWithoutQuery ?? id
}

const toPosixPath = (filePath: string): string => filePath.split(sep).join('/')

const NODE_MODULES_SEGMENT_PATTERN = /(?:^|\/)node_modules(?:\/|$)/

const BRAND_MODULE_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
])

const isBrandModuleStatement = (statement: AstNode): boolean => {
  if (!BRAND_MODULE_STATEMENT_TYPES.has(statement.type)) {
    return false
  }
  const source = statement['source']
  return (
    isAstNode(source) &&
    isLiteral(source) &&
    source.value === BRAND_MODULE_SPECIFIER
  )
}

const isAlreadyBranded = (program: AstNode): boolean => {
  const body = program['body']
  if (!Array.isArray(body)) {
    return false
  }
  return body.some(
    statement => isAstNode(statement) && isBrandModuleStatement(statement),
  )
}

const isEligibleModuleId = (
  id: string,
  isFoldkitCoreResolved: boolean,
): boolean => {
  if (id.startsWith(VIRTUAL_MODULE_PREFIX)) {
    return false
  }
  const strippedId = stripQuery(id)
  const normalizedId = toPosixPath(strippedId)
  if (NODE_MODULES_SEGMENT_PATTERN.test(normalizedId)) {
    return false
  }
  if (!SCRIPT_FILE_PATTERN.test(strippedId)) {
    return false
  }
  // NOTE: the unanchored `packages/foldkit/` fragment is a best-effort
  // fallback, applied only when the installed foldkit package could not be
  // resolved. When it was resolved, the plugin's precise `foldkitPackageRoot`
  // gate already excluded core, so re-applying the fragment here would wrongly
  // un-brand a consumer whose own app path merely contains the segment (a
  // workspace named `foldkit`, a vendored fork holding app code).
  if (isFoldkitCoreResolved) {
    return true
  }
  return !normalizedId.includes(FOLDKIT_CORE_PATH_FRAGMENT)
}

// NAMING

type FunctionCollection = Readonly<{
  functionNodes: ReadonlyArray<FunctionNode>
  parentByNode: ReadonlyMap<AstNode, AstNode>
}>

const collectFunctionNodes = (program: AstNode): FunctionCollection => {
  const functionNodes: Array<FunctionNode> = []
  const parentByNode = new Map<AstNode, AstNode>()
  const visitNode = (node: AstNode): void => {
    if (isFunctionNode(node)) {
      functionNodes.push(node)
    }
    walkChildNodes(node, child => {
      parentByNode.set(child, node)
      visitNode(child)
    })
  }
  visitNode(program)
  const orderedFunctionNodes = [...functionNodes].sort(
    (first, second) => first.start - second.start,
  )
  return { functionNodes: orderedFunctionNodes, parentByNode }
}

const namedKeyText = (key: AstNode): string | undefined => {
  if (isIdentifier(key) || isPrivateIdentifier(key)) {
    return key.name
  }
  if (isLiteral(key) && typeof key.value === 'string') {
    return key.value
  }
  return undefined
}

const rawFunctionName = (
  functionNode: FunctionNode,
  parentByNode: ReadonlyMap<AstNode, AstNode>,
): string => {
  if (
    functionNode.id !== null &&
    functionNode.id !== undefined &&
    isIdentifier(functionNode.id)
  ) {
    return functionNode.id.name
  }
  const parent = parentByNode.get(functionNode)
  if (parent === undefined) {
    return ANONYMOUS_FUNCTION_NAME
  }
  if (
    isVariableDeclarator(parent) &&
    parent.init === functionNode &&
    isIdentifier(parent.id)
  ) {
    return parent.id.name
  }
  if (
    isNamedValueNode(parent) &&
    parent.value === functionNode &&
    !parent.computed
  ) {
    return namedKeyText(parent.key) ?? ANONYMOUS_FUNCTION_NAME
  }
  if (parent.type === 'ExportDefaultDeclaration') {
    return DEFAULT_EXPORT_FUNCTION_NAME
  }
  if (
    isAssignmentExpression(parent) &&
    parent.right === functionNode &&
    isMemberExpression(parent.left) &&
    !parent.left.computed &&
    isIdentifier(parent.left.property)
  ) {
    return parent.left.property.name
  }
  return ANONYMOUS_FUNCTION_NAME
}

const assignFunctionIds = (
  functionNodes: ReadonlyArray<FunctionNode>,
  parentByNode: ReadonlyMap<AstNode, AstNode>,
  modulePath: string,
): ReadonlyMap<FunctionNode, string> => {
  const functionIds = new Map<FunctionNode, string>()
  const occurrenceCountsByName = new Map<string, number>()
  for (const functionNode of functionNodes) {
    const functionName = rawFunctionName(functionNode, parentByNode)
    const occurrenceCount = (occurrenceCountsByName.get(functionName) ?? 0) + 1
    occurrenceCountsByName.set(functionName, occurrenceCount)
    const uniqueFunctionName =
      occurrenceCount < FIRST_DUPLICATE_NAME_SUFFIX
        ? functionName
        : `${functionName}~${occurrenceCount}`
    functionIds.set(functionNode, `${modulePath}#${uniqueFunctionName}`)
  }
  return functionIds
}

// WRAPS

type Wrap = Readonly<{
  target: AstNode
  functionId: string
}>

const ownReturnArguments = (functionBody: AstNode): Array<AstNode> => {
  const returnArguments: Array<AstNode> = []
  const collectFromNode = (node: AstNode): void => {
    if (isFunctionNode(node)) {
      return
    }
    if (isReturnStatement(node)) {
      if (node.argument !== null && node.argument !== undefined) {
        returnArguments.push(node.argument)
      }
      return
    }
    walkChildNodes(node, collectFromNode)
  }
  walkChildNodes(functionBody, collectFromNode)
  return returnArguments
}

const wrapTargets = (functionNode: FunctionNode): Array<AstNode> => {
  if (functionNode.body.type === 'BlockStatement') {
    return ownReturnArguments(functionNode.body)
  }
  return [functionNode.body]
}

const collectWraps = (
  functionNodes: ReadonlyArray<FunctionNode>,
  functionIds: ReadonlyMap<FunctionNode, string>,
): Array<Wrap> => {
  const wraps: Array<Wrap> = []
  for (const functionNode of functionNodes) {
    const functionId = functionIds.get(functionNode)
    if (functionId === undefined) {
      continue
    }
    for (const target of wrapTargets(functionNode)) {
      wraps.push({ target, functionId })
    }
  }
  return wraps
}

const isDirectiveStatement = (node: AstNode): boolean =>
  node.type === 'ExpressionStatement' && typeof node['directive'] === 'string'

const hashbangEndOffset = (program: AstNode): number => {
  const hashbang = program['hashbang']
  if (isAstNode(hashbang)) {
    return hashbang.end
  }
  return 0
}

const importInsertionOffset = (program: AstNode): number => {
  const body = program['body']
  if (!Array.isArray(body)) {
    return hashbangEndOffset(program)
  }
  let offset = hashbangEndOffset(program)
  for (const statement of body) {
    if (!isAstNode(statement) || !isDirectiveStatement(statement)) {
      break
    }
    offset = statement.end
  }
  return offset
}

const uniqueBrandAlias = (code: string): string => {
  if (!code.includes(BRAND_IMPORT_ALIAS)) {
    return BRAND_IMPORT_ALIAS
  }
  for (let suffix = FIRST_ALIAS_SUFFIX; ; suffix += 1) {
    const candidate = `${BRAND_IMPORT_ALIAS}${suffix}`
    if (!code.includes(candidate)) {
      return candidate
    }
  }
}

// TRANSFORM

/** Result of {@link transformViewIdentity}: rewritten code plus a source map. */
export type ViewIdentityTransformResult = Readonly<{
  code: string
  map: SourceMap
}>

/**
 * Brands the return value of every function in a module with that function's
 * identity via `brandViewResult` from `foldkit/brand`.
 *
 * Identities are `${posixRelativePathFromRoot}#${functionName}`, with the
 * function name taken from, in order: the function's own id (declarations and
 * named function expressions), the variable a function expression is bound
 * to, the non-computed key of an
 * object property, class method, or class field, `default` for an
 * export-default function, the member name of an `x.y = fn` assignment, and
 * `anonymous` otherwise. Duplicate names within a module are disambiguated in
 * source order with `~2`, `~3`, and so on, so ids are fully deterministic.
 *
 * Expression-body arrows have their body wrapped in the branding call; block
 * bodies have every `return` argument belonging directly to the function
 * wrapped (nested functions instrument their own returns, and bare `return`
 * is untouched). Branding is set-if-absent on vnodes at runtime, so wrapping
 * every function, including async and generator functions and functions that
 * never produce a vnode, is inert outside view results.
 *
 * Skips foldkit core modules: if the element factory's own returns were
 * branded, every vnode would carry an identity at construction and
 * set-if-absent would neutralize the feature. Core under `node_modules` is
 * always skipped. The plugin resolves the installed foldkit package and passes
 * `isFoldkitCoreResolved`; when it resolved, the plugin's precise package-root
 * gate is authoritative and the coarse `packages/foldkit/` path fragment is
 * left to the resolution-failed fallback, so a consumer whose own path merely
 * contains that segment is still branded.
 *
 * Skips modules whose parsed program imports or re-exports the
 * `foldkit/brand` specifier: packages such as `@foldkit/ui` and
 * `@foldkit/devtools` brand their dist at package build time, and pnpm
 * symlink realpaths can surface that dist outside `node_modules`, where the
 * module-id checks alone would let a build wrap the same returns twice. A
 * module that merely mentions the specifier in a comment or string is still
 * branded; the raw-text check is only a fast negative prefilter.
 *
 * Returns `null` when the module needs no changes.
 */
export const transformViewIdentity = (
  code: string,
  id: string,
  root: string,
  options?: Readonly<{ isFoldkitCoreResolved?: boolean }>,
): ViewIdentityTransformResult | null => {
  if (!isEligibleModuleId(id, options?.isFoldkitCoreResolved ?? false)) {
    return null
  }
  const program = parseProgram(code)
  if (program === null) {
    return null
  }
  if (code.includes(BRAND_MODULE_SPECIFIER) && isAlreadyBranded(program)) {
    return null
  }
  const { functionNodes, parentByNode } = collectFunctionNodes(program)
  const modulePath = toPosixPath(relative(root, stripQuery(id)))
  const functionIds = assignFunctionIds(functionNodes, parentByNode, modulePath)
  const wraps = collectWraps(functionNodes, functionIds)
  if (wraps.length === 0) {
    return null
  }
  const brandAlias = uniqueBrandAlias(code)
  const sourceText = new MagicString(code)
  // NOTE: applied in descending target order so that when a nested wrap ends
  // exactly where its enclosing wrap ends (`return () => x`), the inner
  // closer is appended first and the calls nest correctly.
  const orderedWraps = [...wraps].sort(
    (first, second) => second.target.start - first.target.start,
  )
  for (const { target, functionId } of orderedWraps) {
    sourceText.appendLeft(target.start, `${brandAlias}((`)
    sourceText.appendRight(target.end, `), ${JSON.stringify(functionId)})`)
  }
  const importStatement = `import { ${BRAND_EXPORT_NAME} as ${brandAlias} } from '${BRAND_MODULE_SPECIFIER}'\n`
  const insertionOffset = importInsertionOffset(program)
  if (insertionOffset === 0) {
    sourceText.prepend(importStatement)
  } else {
    sourceText.appendLeft(insertionOffset, `\n${importStatement}`)
  }
  return {
    code: sourceText.toString(),
    map: sourceText.generateMap({ hires: 'boundary' }),
  }
}

// RESOLUTION

// NOTE: `requireFromRoot.resolve('foldkit')` cannot produce a path here:
// foldkit's export map is ESM-only, so resolving it under require conditions
// throws ERR_PACKAGE_PATH_NOT_EXPORTED. Walking the require resolution
// candidate directories locates the package without touching the export map.
const resolveFoldkitPackageRoot = (root: string): string | undefined => {
  const requireFromRoot = createRequire(resolve(root, 'noop.js'))
  const candidateDirectories =
    requireFromRoot.resolve.paths(FOLDKIT_PACKAGE_NAME) ?? []
  for (const candidateDirectory of candidateDirectories) {
    const packageDirectory = join(candidateDirectory, FOLDKIT_PACKAGE_NAME)
    if (existsSync(join(packageDirectory, 'package.json'))) {
      try {
        return realpathSync(packageDirectory)
      } catch {
        return packageDirectory
      }
    }
  }
  return undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const resolveBrandModulePath = (root: string): string | undefined => {
  const packageRoot = resolveFoldkitPackageRoot(root)
  if (packageRoot === undefined) {
    return undefined
  }
  try {
    const packageJson: unknown = JSON.parse(
      readFileSync(join(packageRoot, 'package.json'), 'utf8'),
    )
    if (!isRecord(packageJson) || !isRecord(packageJson['exports'])) {
      return undefined
    }
    const brandExportEntry = packageJson['exports']['./brand']
    const importTarget = isRecord(brandExportEntry)
      ? brandExportEntry['import']
      : brandExportEntry
    if (typeof importTarget !== 'string') {
      return undefined
    }
    const brandModulePath = join(packageRoot, importTarget)
    if (existsSync(brandModulePath)) {
      return brandModulePath
    }
    return undefined
  } catch {
    return undefined
  }
}

const isUnderDirectory = (posixPath: string, posixDirectory: string): boolean =>
  posixPath === posixDirectory || posixPath.startsWith(`${posixDirectory}/`)

// PLUGIN

/**
 * Vite plugin that applies {@link transformViewIdentity} to application
 * modules in both dev and build. Skips `node_modules`, virtual modules,
 * non-script files, and foldkit core itself, resolved from the config root so
 * that configs aliasing `foldkit` straight into `packages/foldkit/src` are
 * excluded too. `@foldkit/ui` and `@foldkit/devtools` modules are branded on
 * purpose.
 *
 * Also pins `foldkit/brand` to the installed package's brand module via a
 * `resolve.alias` entry, so the injected import keeps resolving in configs
 * whose own `foldkit` alias would otherwise swallow the subpath.
 */
export const foldkitViewIdentity = (): Plugin => {
  let resolvedRoot = process.cwd()
  let foldkitPackageRoot: string | undefined
  return {
    name: 'foldkit:view-identity',
    config: userConfig => {
      const brandModulePath = resolveBrandModulePath(
        userConfig.root ?? process.cwd(),
      )
      if (brandModulePath === undefined) {
        return undefined
      }
      // NOTE: returned as an array because Vite's mergeAlias puts array
      // entries from a plugin ahead of the user's aliases; object-form
      // entries would land after a user's bare `foldkit` alias and the
      // injected specifier would be rewritten into a nonexistent path.
      return {
        resolve: {
          alias: [
            { find: BRAND_MODULE_SPECIFIER, replacement: brandModulePath },
          ],
        },
      }
    },
    configResolved: config => {
      resolvedRoot = config.root
      const packageRoot = resolveFoldkitPackageRoot(config.root)
      foldkitPackageRoot =
        packageRoot === undefined ? undefined : toPosixPath(packageRoot)
    },
    transform: (code, id) => {
      if (
        foldkitPackageRoot !== undefined &&
        isUnderDirectory(toPosixPath(stripQuery(id)), foldkitPackageRoot)
      ) {
        return null
      }
      return transformViewIdentity(code, id, resolvedRoot, {
        isFoldkitCoreResolved: foldkitPackageRoot !== undefined,
      })
    },
  }
}
