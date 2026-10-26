import { Array, Option } from 'effect'
import {
  type ESTree,
  type OxlintScope,
  type Reference,
  type Variable,
} from 'effect-oxlint'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

export const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

export const isIdentifierReference = (
  node: unknown,
): node is ESTree.IdentifierReference => isIdentifier(node)

export const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

export const isTemplateLiteral = (
  node: unknown,
): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral'

export const isCallExpression = (
  node: unknown,
): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

export const isMemberExpression = (
  node: unknown,
): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

export const isObjectExpression = (
  node: unknown,
): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

export const isObjectProperty = (
  node: unknown,
): node is ESTree.ObjectProperty =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Property'

export const isArrayExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ArrayExpression'
  elements: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

export const isSpreadElement = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SpreadElement'

export const isArrowFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

export const helperCalleeName = (callee: unknown): Option.Option<string> => {
  if (isIdentifier(callee)) {
    return Option.some(callee.name)
  }
  if (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property)
  ) {
    return Option.some(callee.property.name)
  }
  return Option.none()
}

type TransparentExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const isTransparentExpression = (
  node: unknown,
): node is TransparentExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ChainExpression' ||
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSInstantiationExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSTypeAssertion')

const innermostExpression = (node: unknown): unknown =>
  isTransparentExpression(node) ? innermostExpression(node.expression) : node

const isTSQualifiedName = (node: unknown): node is ESTree.TSQualifiedName =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSQualifiedName'

export type StaticMemberPath = Readonly<{
  root: ESTree.IdentifierReference
  members: ReadonlyArray<string>
}>

export const staticMemberPath = (
  node: unknown,
): Option.Option<StaticMemberPath> => {
  const expression = innermostExpression(node)
  if (isIdentifierReference(expression)) {
    return Option.some({ root: expression, members: [] })
  }
  if (isTSQualifiedName(expression)) {
    return Option.map(staticMemberPath(expression.left), path => ({
      root: path.root,
      members: [...path.members, expression.right.name],
    }))
  }
  if (!isMemberExpression(expression)) {
    return Option.none()
  }

  return Option.flatMap(staticMemberPath(expression.object), path =>
    Option.map(staticMemberName(expression), member => ({
      root: path.root,
      members: [...path.members, member],
    })),
  )
}

export const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  Option.exists(helperCalleeName(callee), name => name === helperName)

export const staticStringValue = (node: unknown): Option.Option<string> => {
  if (isStringLiteral(node)) {
    return Option.some(node.value)
  }
  if (isTemplateLiteral(node) && Array.isArrayEmpty(node.expressions)) {
    return Option.flatMap(Array.head(node.quasis), quasi =>
      Option.fromNullishOr(quasi.value.cooked),
    )
  }
  return Option.none()
}

export const staticMemberName = (
  node: ESTree.MemberExpression,
): Option.Option<string> => {
  if (!node.computed && isIdentifier(node.property)) {
    return Option.some(node.property.name)
  }
  return staticStringValue(node.property)
}

export const staticPropertyName = (
  property: Readonly<{
    computed?: boolean
    key: ESTree.PropertyKey
  }>,
): Option.Option<string> => {
  if (!property.computed && isIdentifier(property.key)) {
    return Option.some(property.key.name)
  }
  return staticStringValue(property.key)
}

export const indexReferences = (
  scopes: ReadonlyArray<OxlintScope>,
): WeakMap<ESTree.Node, Reference> => {
  const references = new WeakMap<ESTree.Node, Reference>()

  for (const scope of scopes) {
    for (const reference of scope.references) {
      references.set(reference.identifier, reference)
    }
  }
  return references
}

export const resolvedVariable = (
  references: WeakMap<ESTree.Node, Reference>,
  node: ESTree.IdentifierReference,
): Option.Option<Variable> =>
  Option.flatMap(Option.fromNullishOr(references.get(node)), reference =>
    Option.fromNullishOr(reference.resolved),
  )

export type ImportedPath = Readonly<{
  source: string
  members: ReadonlyArray<string>
  localMembers: ReadonlyArray<string>
}>

export type DefinitionMethodOwner = Readonly<{
  importedPath: Pick<ImportedPath, 'source' | 'members'> | undefined
  isFromMessageAdapter: boolean
  path: StaticMemberPath
}>

const importedName = (specifier: ESTree.ImportSpecifier): string =>
  specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : specifier.imported.value

export const resolveImportedPath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ImportedPath> =>
  Option.gen(function* () {
    const path = yield* staticMemberPath(node)
    const variable = yield* resolvedVariable(references, path.root)
    const definition = yield* Array.findFirst(
      variable.defs,
      definition => definition.type === 'ImportBinding',
    )

    if (definition.parent?.type !== 'ImportDeclaration') {
      return yield* Option.none()
    }

    const localMembers = [path.root.name, ...path.members]
    if (definition.node.type === 'ImportNamespaceSpecifier') {
      return {
        source: definition.parent.source.value,
        members: path.members,
        localMembers,
      }
    }
    if (definition.node.type !== 'ImportSpecifier') {
      return yield* Option.none()
    }

    return {
      source: definition.parent.source.value,
      members: [importedName(definition.node), ...path.members],
      localMembers,
    }
  })

const foldkitNamespaceBySource: Readonly<Record<string, string>> = {
  'foldkit/command': 'Command',
  'foldkit/experimental': 'Experimental',
  'foldkit/experimental/query': 'Query',
  'foldkit/html': 'Html',
  'foldkit/mapBinding': 'MapBinding',
  'foldkit/managedResource': 'ManagedResource',
  'foldkit/message': 'Message',
  'foldkit/mount': 'Mount',
  'foldkit/navigation': 'Navigation',
  'foldkit/program': 'Program',
  'foldkit/route': 'Route',
  'foldkit/runtime': 'Runtime',
  'foldkit/schema': 'Schema',
  'foldkit/struct': 'Struct',
  'foldkit/block': 'Block',
  'foldkit/subscription': 'Subscription',
  'foldkit/update': 'Update',
}

export const resolveFoldkitApiPath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Option.flatMap(resolveImportedPath(references, node), path => {
    if (path.source === 'foldkit') {
      return Option.some(path.members)
    }

    const namespace = foldkitNamespaceBySource[path.source]
    return namespace === undefined
      ? Option.none()
      : Option.some([namespace, ...path.members])
  })

const isTypeAnnotatedIdentifier = (
  node: unknown,
): node is Readonly<{
  type: 'Identifier'
  typeAnnotation?: ESTree.TSTypeAnnotation | null
}> => isIdentifier(node)

const isFunctionWithParameters = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression')

const isTypeReference = (node: unknown): node is ESTree.TSTypeReference =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeReference'

const isTypeAliasDeclaration = (
  node: unknown,
): node is ESTree.TSTypeAliasDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeAliasDeclaration'

const escapedRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

type SanitizedModuleSource = Readonly<{
  text: string
  stringValues: ReadonlyMap<string, string>
}>

const sanitizedModuleSource = (sourceText: string): SanitizedModuleSource => {
  let text = ''
  let index = 0
  const stringValues = new Map<string, string>()

  while (index < sourceText.length) {
    const character = sourceText.charAt(index)
    const nextCharacter = sourceText.charAt(index + 1)

    if (character === '/' && nextCharacter === '/') {
      while (index < sourceText.length && sourceText.charAt(index) !== '\n') {
        text += ' '
        index += 1
      }
      continue
    }

    if (character === '/' && nextCharacter === '*') {
      text += '  '
      index += 2
      while (
        index < sourceText.length &&
        !(
          sourceText.charAt(index) === '*' &&
          sourceText.charAt(index + 1) === '/'
        )
      ) {
        text += sourceText.charAt(index) === '\n' ? '\n' : ' '
        index += 1
      }
      if (index < sourceText.length) {
        text += '  '
        index += 2
      }
      continue
    }

    if (character === '`') {
      text += ' '
      index += 1
      while (index < sourceText.length) {
        const templateCharacter = sourceText.charAt(index)
        if (templateCharacter === '\\') {
          text += ' '
          index += 1
          if (index < sourceText.length) {
            text += sourceText.charAt(index) === '\n' ? '\n' : ' '
            index += 1
          }
          continue
        }
        if (templateCharacter === '`') {
          text += ' '
          index += 1
          break
        }

        text += templateCharacter === '\n' ? '\n' : ' '
        index += 1
      }
      continue
    }

    if (character === "'" || character === '"') {
      const quote = character
      let value = ''
      index += 1
      while (index < sourceText.length) {
        const stringCharacter = sourceText.charAt(index)
        if (stringCharacter === '\\') {
          value += stringCharacter
          index += 1
          if (index < sourceText.length) {
            value += sourceText.charAt(index)
            index += 1
          }
          continue
        }
        if (stringCharacter === quote) {
          index += 1
          break
        }

        value += stringCharacter
        index += 1
      }

      const marker = `__foldkit_module_string_${stringValues.size}__`
      stringValues.set(marker, value)
      text += `${quote}${marker}${quote}`
      continue
    }

    text += character
    index += 1
  }

  return { text, stringValues }
}

const moduleSourceValue = (
  source: SanitizedModuleSource,
  marker: string,
): Option.Option<string> =>
  Option.fromNullishOr(source.stringValues.get(marker))

const moduleCandidates = (
  importerFilename: string,
  source: string,
): ReadonlyArray<string> => {
  if (!source.startsWith('.')) {
    return []
  }

  const absolute = resolve(dirname(importerFilename), source)
  const extension = extname(absolute)
  if (extension === '.js' || extension === '.jsx') {
    const withoutExtension = absolute.slice(0, -extension.length)
    return [`${withoutExtension}.ts`, `${withoutExtension}.tsx`]
  }
  if (extension !== '') {
    return [absolute]
  }

  return [
    `${absolute}.ts`,
    `${absolute}.tsx`,
    resolve(absolute, 'index.ts'),
    resolve(absolute, 'index.tsx'),
  ]
}

/** Resolves supported relative source imports without loading a compiler. */
export const sourceFileForModule = (
  importerFilename: string,
  source: string,
): Option.Option<string> =>
  Array.findFirst(moduleCandidates(importerFilename, source), existsSync)

const importsFoldkitBlockNamespace = (
  source: SanitizedModuleSource,
): boolean => {
  const namespaceImport = source.text.match(
    /^\s*import\s+(?:type\s+)?\*\s+as\s+Block\s+from\s*['"]([^'"]+)['"]/mu,
  )
  if (
    namespaceImport !== null &&
    Option.contains(
      moduleSourceValue(source, namespaceImport[1] ?? ''),
      'foldkit/block',
    )
  ) {
    return true
  }

  const namedImports = source.text.matchAll(
    /^\s*import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gmu,
  )
  for (const namedImport of namedImports) {
    const specifiers = namedImport[1]
    const sourceMarker = namedImport[2]
    if (
      specifiers !== undefined &&
      sourceMarker !== undefined &&
      /(?:^|,)\s*(?:type\s+)?Block\s*(?:,|$)/u.test(specifiers) &&
      Option.contains(moduleSourceValue(source, sourceMarker), 'foldkit')
    ) {
      return true
    }
  }

  return false
}

const directlyExportsFoldkitViewBuilder = (
  source: SanitizedModuleSource,
  exportedName: string,
): boolean => {
  if (!importsFoldkitBlockNamespace(source)) {
    return false
  }

  return new RegExp(
    `^\\s*export\\s+type\\s+${escapedRegExp(exportedName)}\\s*=\\s*Block\\.ViewBuilderFor\\s*<`,
    'mu',
  ).test(source.text)
}

type Reexport = Readonly<{ importedName: string; source: string }>

type ImportedViewBuilderProvenanceCache = Map<string, boolean>

const importedViewBuilderProvenanceCaches = new WeakMap<
  WeakMap<ESTree.Node, Reference>,
  ImportedViewBuilderProvenanceCache
>()

type ImportedDefinitionMethodOwnerCache = Map<
  string,
  Pick<ImportedPath, 'source' | 'members'> | undefined
>

const importedDefinitionMethodOwnerCaches = new WeakMap<
  WeakMap<ESTree.Node, Reference>,
  ImportedDefinitionMethodOwnerCache
>()

const importedDefinitionMethodOwnerCacheFor = (
  references: WeakMap<ESTree.Node, Reference>,
): ImportedDefinitionMethodOwnerCache => {
  const existing = importedDefinitionMethodOwnerCaches.get(references)
  if (existing !== undefined) {
    return existing
  }

  const created = new Map<
    string,
    Pick<ImportedPath, 'source' | 'members'> | undefined
  >()
  importedDefinitionMethodOwnerCaches.set(references, created)
  return created
}

const importedViewBuilderProvenanceCacheFor = (
  references: WeakMap<ESTree.Node, Reference>,
): ImportedViewBuilderProvenanceCache => {
  const existing = importedViewBuilderProvenanceCaches.get(references)
  if (existing !== undefined) {
    return existing
  }

  const created = new Map<string, boolean>()
  importedViewBuilderProvenanceCaches.set(references, created)
  return created
}

const reexportOf = (
  source: SanitizedModuleSource,
  exportedName: string,
): Option.Option<Reexport> => {
  const declarations = source.text.matchAll(
    /^\s*export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gmu,
  )
  for (const declaration of declarations) {
    const specifiers = declaration[1]
    const sourceMarker = declaration[2]
    if (specifiers === undefined || sourceMarker === undefined) {
      continue
    }

    const reexportSource = moduleSourceValue(source, sourceMarker)
    if (Option.isNone(reexportSource)) {
      continue
    }

    for (const specifier of specifiers.split(',')) {
      const match = specifier
        .trim()
        .match(
          /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/u,
        )
      if (match === null) {
        continue
      }

      const importedName = match[1]
      const reexportedName = match[2] ?? importedName
      if (importedName !== undefined && reexportedName === exportedName) {
        return Option.some({
          importedName,
          source: reexportSource.value,
        })
      }
    }
  }

  return Option.none()
}

const importedViewBuilderHasFoldkitProvenance = (
  importerFilename: string | undefined,
  source: string,
  exportedName: string,
  cache: ImportedViewBuilderProvenanceCache,
  visited: ReadonlySet<string> = new Set(),
): boolean => {
  if (importerFilename === undefined) {
    return false
  }

  const cacheKey = `${importerFilename}\u0000${source}\u0000${exportedName}`
  if (visited.size === 0) {
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  const sourceFile = sourceFileForModule(importerFilename, source)
  if (Option.isNone(sourceFile) || visited.has(sourceFile.value)) {
    if (visited.size === 0) {
      cache.set(cacheKey, false)
    }
    return false
  }

  const sanitizedSource = sanitizedModuleSource(
    readFileSync(sourceFile.value, 'utf8'),
  )
  const hasFoldkitProvenance =
    directlyExportsFoldkitViewBuilder(sanitizedSource, exportedName) ||
    Option.exists(reexportOf(sanitizedSource, exportedName), reexport =>
      importedViewBuilderHasFoldkitProvenance(
        sourceFile.value,
        reexport.source,
        reexport.importedName,
        cache,
        new Set([...visited, sourceFile.value]),
      ),
    )
  if (visited.size === 0) {
    cache.set(cacheKey, hasFoldkitProvenance)
  }

  return hasFoldkitProvenance
}

const isFoldkitViewBuilderType = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
  importerFilename?: string,
  visited: ReadonlySet<Variable> = new Set(),
): boolean => {
  if (!isTypeReference(node)) {
    return false
  }

  const foldkitPath = resolveFoldkitApiPath(references, node.typeName)
  if (
    Option.exists(foldkitPath, path => {
      const [namespace, typeName, extraMember] = path
      return (
        extraMember === undefined &&
        ((namespace === 'Html' && typeName === 'HtmlBuilder') ||
          (namespace === 'Block' && typeName === 'ViewBuilderFor'))
      )
    })
  ) {
    return true
  }

  const importedPath = resolveImportedPath(references, node.typeName)
  if (
    Option.exists(importedPath, path => {
      const typeName = Option.getOrUndefined(Array.last(path.members))
      return (
        typeName !== undefined &&
        importedViewBuilderHasFoldkitProvenance(
          importerFilename,
          path.source,
          typeName,
          importedViewBuilderProvenanceCacheFor(references),
        )
      )
    })
  ) {
    return true
  }

  return Option.exists(staticMemberPath(node.typeName), path => {
    if (Array.isReadonlyArrayNonEmpty(path.members)) {
      return false
    }

    return Option.exists(resolvedVariable(references, path.root), variable => {
      if (visited.has(variable)) {
        return false
      }

      return variable.defs.some(definition =>
        isTypeAliasDeclaration(definition.node)
          ? isFoldkitViewBuilderType(
              references,
              definition.node.typeAnnotation,
              importerFilename,
              new Set([...visited, variable]),
            )
          : false,
      )
    })
  })
}

const isFoldkitDefinitionViewCallback = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean => {
  const parent = functionNode.parent
  if (!isCallExpression(parent) || !parent.arguments.includes(functionNode)) {
    return false
  }

  if (isOwnedDefinitionCall(parent, 'makeView', references)) {
    return true
  }

  return Option.exists(staticMemberPath(parent.callee), path => {
    const [previousMethod, method] = path.members.slice(-2)
    if (previousMethod !== 'makeView' || method !== 'withInputs') {
      return false
    }

    return (
      isMemberExpression(parent.callee) &&
      isOwnedDefinitionCallee(parent.callee.object, 'makeView', references)
    )
  })
}

const hasHtmlBuilderTypeAnnotation = (
  references: WeakMap<ESTree.Node, Reference>,
  identifier: Readonly<{
    type: 'Identifier'
    typeAnnotation?: ESTree.TSTypeAnnotation | null
  }>,
  importerFilename?: string,
): boolean => {
  return isFoldkitViewBuilderType(
    references,
    identifier.typeAnnotation?.typeAnnotation,
    importerFilename,
  )
}

const isHtmlBuilderParameter = (
  references: WeakMap<ESTree.Node, Reference>,
  root: ESTree.IdentifierReference,
  importerFilename?: string,
): boolean =>
  Option.exists(resolvedVariable(references, root), variable =>
    variable.defs.some(definition => {
      if (
        definition.type !== 'Parameter' ||
        !isTypeAnnotatedIdentifier(definition.name)
      ) {
        return false
      }

      if (
        hasHtmlBuilderTypeAnnotation(
          references,
          definition.name,
          importerFilename,
        )
      ) {
        return true
      }

      if (!isFunctionWithParameters(definition.node)) {
        return false
      }

      return (
        Option.exists(
          Array.last(definition.node.params),
          parameter => parameter === definition.name,
        ) && isFoldkitDefinitionViewCallback(references, definition.node)
      )
    }),
  )

export const isFoldkitHtmlBuilderMember = (
  callee: unknown,
  memberName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  importerFilename?: string,
): boolean => {
  if (references === undefined) {
    return calleeMatchesHelperName(callee, memberName)
  }

  const isFoldkitInertHtmlMember = Option.exists(
    resolveFoldkitApiPath(references, callee),
    path => {
      const [namespace, builderName, importedMember, extraImportedMember] = path
      return (
        namespace === 'Html' &&
        builderName === 'inertHtml' &&
        importedMember === memberName &&
        extraImportedMember === undefined
      )
    },
  )
  if (isFoldkitInertHtmlMember) {
    return true
  }

  return Option.exists(staticMemberPath(callee), path => {
    const [member, extraMember] = path.members

    return (
      member === memberName &&
      extraMember === undefined &&
      isHtmlBuilderParameter(references, path.root, importerFilename)
    )
  })
}

export const isUnshadowedReference = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.Node,
): boolean => {
  if (references === undefined) {
    return true
  }

  const reference = references.get(node)
  return (
    reference !== undefined &&
    (reference.resolved === null || Array.isArrayEmpty(reference.resolved.defs))
  )
}

export const isVariableDeclarator = (
  node: unknown,
): node is ESTree.VariableDeclarator =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclarator'

export const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

export const isProgram = (node: unknown): node is ESTree.Program =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Program'

export const firstStringArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  return isStringLiteral(first) ? first : undefined
}

export const firstCommandNameArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  if (isStringLiteral(first)) {
    return first
  }

  if (!isCallExpression(first) || !isMemberExpression(first.callee)) {
    return undefined
  }

  if (first.callee.computed || !isIdentifier(first.callee.property, 'name')) {
    return undefined
  }

  const [name] = first.arguments
  return isStringLiteral(name) ? name : undefined
}

const bindingConfigHasProperties = (
  node: ESTree.CallExpression,
  names: ReadonlyArray<string>,
  references?: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const config = blockBindingConfiguration(node, references)
  if (!isObjectExpression(config)) {
    return false
  }

  const properties = new Set(
    config.properties.flatMap(property =>
      isObjectProperty(property)
        ? Option.match(staticPropertyName(property), {
            onNone: () => [],
            onSome: name => [name],
          })
        : [],
    ),
  )
  return names.every(name => properties.has(name))
}

const bindingConfigHasStaticStringProperty = (
  node: ESTree.CallExpression,
  name: string,
  references?: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const config = blockBindingConfiguration(node, references)
  if (!isObjectExpression(config)) {
    return false
  }

  return config.properties.some(
    property =>
      isObjectProperty(property) &&
      Option.contains(staticPropertyName(property), name) &&
      Option.isSome(staticStringValue(property.value)),
  )
}

const directBindingCall = (
  node: ESTree.CallExpression,
): ESTree.CallExpression => {
  if (
    isMemberExpression(node.callee) &&
    Option.contains(staticMemberName(node.callee), 'withOutMessagePolicy') &&
    isCallExpression(node.callee.object)
  ) {
    return directBindingCall(node.callee.object)
  }

  return node
}

/** Returns the owned `makeBinding` call beneath a direct fluent policy chain. */
export const blockBindingSourceCall = (
  node: ESTree.CallExpression,
): ESTree.CallExpression => directBindingCall(node)

const isMapBindingCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references !== undefined &&
  Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'MapBinding' &&
      helperName === 'makeMapBinding' &&
      extraMember === undefined
    )
  })

/** Recognizes a Definition method or dedicated Foldkit helper Binding call. */
export const isBlockBindingCall = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const bindingCall = directBindingCall(node)
  return (
    isMapBindingCall(bindingCall, references) ||
    isOwnedDefinitionCall(bindingCall, 'makeBinding', references)
  )
}

/** Returns a parent-owned Binding configuration, or a standalone fold configuration. */
export const blockBindingConfiguration = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
): ESTree.CallExpression['arguments'][number] | undefined => {
  const bindingCall = directBindingCall(node)

  return Option.getOrUndefined(
    Array.get(
      bindingCall.arguments,
      isMapBindingCall(bindingCall, references)
        ? 2
        : Option.exists(staticMemberPath(bindingCall.callee), path =>
              Option.contains(Array.last(path.members), 'makeBinding'),
            )
          ? 1
          : 0,
    ),
  )
}

/** Returns the child Block supplied to a recognized parent-owned Binding call. */
export const blockBindingChild = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
): unknown => {
  const bindingCall = directBindingCall(node)
  if (isMapBindingCall(bindingCall, references)) {
    return Option.getOrUndefined(Array.get(bindingCall.arguments, 1))
  }
  if (!isOwnedDefinitionCall(bindingCall, 'makeBinding', references)) {
    return undefined
  }
  return Option.getOrUndefined(Array.head(bindingCall.arguments))
}

/** Returns the parent Definition supplied to a recognized Binding call. */
export const blockBindingParent = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
): unknown => {
  const bindingCall = directBindingCall(node)
  if (isMapBindingCall(bindingCall, references)) {
    return Option.getOrUndefined(Array.head(bindingCall.arguments))
  }
  if (
    !isMemberExpression(bindingCall.callee) ||
    !Option.contains(staticMemberName(bindingCall.callee), 'makeBinding')
  ) {
    return undefined
  }
  return bindingCall.callee.object
}

/** Recognizes static and keyed parent-owned child Bindings from their configuration. */
export const blockBindingMethod = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
): Option.Option<'Static' | 'Keyed'> => {
  const bindingCall = directBindingCall(node)
  if (isMapBindingCall(bindingCall, references)) {
    return Option.some('Keyed')
  }
  if (!isOwnedDefinitionCall(bindingCall, 'makeBinding', references)) {
    return Option.none()
  }

  if (
    bindingConfigHasProperties(node, ['field', 'key'], references) &&
    bindingConfigHasStaticStringProperty(node, 'key', references)
  ) {
    return Option.some('Keyed')
  }

  if (
    bindingConfigHasProperties(
      node,
      ['readAll', 'key', 'read', 'writeAt'],
      references,
    )
  ) {
    return Option.some('Keyed')
  }

  if (
    bindingConfigHasProperties(node, ['read', 'write'], references) ||
    bindingConfigHasProperties(node, ['field'], references)
  ) {
    return Option.some('Static')
  }

  return Option.none()
}

/** Recognizes a Binding's fluent OutMessage policy selection. */
export const isBindingPolicyCall = (
  node: ESTree.CallExpression,
  references?: WeakMap<ESTree.Node, Reference>,
  visited: ReadonlySet<Variable> = new Set(),
): boolean => {
  if (
    !isMemberExpression(node.callee) ||
    !Option.contains(staticMemberName(node.callee), 'withOutMessagePolicy')
  ) {
    return false
  }

  const source = node.callee.object
  if (isCallExpression(source)) {
    return Option.isSome(blockBindingMethod(source, references))
  }
  if (references === undefined || !isIdentifierReference(source)) {
    return false
  }

  return Option.exists(resolvedVariable(references, source), variable => {
    if (visited.has(variable)) {
      return false
    }

    const nextVisited = new Set([...visited, variable])
    return variable.defs.some(definition => {
      if (
        definition.type !== 'Variable' ||
        !isVariableDeclarator(definition.node) ||
        !isCallExpression(definition.node.init)
      ) {
        return false
      }

      return (
        Option.isSome(blockBindingMethod(definition.node.init, references)) ||
        isBindingPolicyCall(definition.node.init, references, nextVisited)
      )
    })
  })
}

/** Finds the owner before an authoring method or its focused Message adapter. */
export const definitionMethodOwnerPath = (
  callee: unknown,
  method: string,
): Option.Option<StaticMemberPath> =>
  Option.flatMap(staticMemberPath(callee), path => {
    if (Option.contains(Array.last(path.members), method)) {
      return Option.some({ ...path, members: path.members.slice(0, -1) })
    }
    if (
      Array.contains(
        ['makeFieldsStep', 'makeCommandsStep', 'makeOutMessageStep'],
        method,
      ) &&
      Option.contains(Array.last(path.members), 'fromMessage') &&
      Option.contains(Array.get(path.members, path.members.length - 2), method)
    ) {
      return Option.some({ ...path, members: path.members.slice(0, -2) })
    }
    return Option.none()
  })

const importedOwnerForPath = (
  references: WeakMap<ESTree.Node, Reference>,
  path: StaticMemberPath,
): Option.Option<Pick<ImportedPath, 'source' | 'members'>> =>
  Option.map(resolveImportedPath(references, path.root), imported => ({
    source: imported.source,
    members: [...imported.members, ...path.members],
  }))

const directlyExportedDefinitionMethodOwner = (
  source: SanitizedModuleSource,
  exportedName: string,
  method: string,
): Option.Option<string> => {
  if (!importsFoldkitBlockNamespace(source)) {
    return Option.none()
  }

  const declarations = source.text.matchAll(
    /^\s*export\s+const\s*\{([^}]*)\}\s*=\s*([A-Za-z_$][\w$]*)/gmu,
  )
  for (const declaration of declarations) {
    const specifiers = declaration[1]
    const ownerName = declaration[2]
    if (specifiers === undefined || ownerName === undefined) {
      continue
    }

    const exportsMethod = specifiers.split(',').some(specifier => {
      const match = specifier
        .trim()
        .match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?$/u)
      if (match === null) {
        return false
      }

      const propertyName = match[1]
      const localName = match[2] ?? propertyName
      return propertyName === method && localName === exportedName
    })
    if (!exportsMethod) {
      continue
    }

    const ownsFoldkitDefinition = new RegExp(
      `^\\s*(?:export\\s+)?const\\s+${escapedRegExp(ownerName)}\\s*=\\s*Block\\.makeDefinition\\s*\\(`,
      'mu',
    ).test(source.text)
    if (ownsFoldkitDefinition) {
      return Option.some(ownerName)
    }
  }

  return Option.none()
}

const importedDefinitionMethodOwner = (
  references: WeakMap<ESTree.Node, Reference>,
  importerFilename: string | undefined,
  imported: ImportedPath,
  method: string,
): Option.Option<Pick<ImportedPath, 'source' | 'members'>> => {
  if (importerFilename === undefined) {
    return Option.none()
  }

  const [exportedName, extraMember] = imported.members
  if (exportedName === undefined || extraMember !== undefined) {
    return Option.none()
  }

  const cache = importedDefinitionMethodOwnerCacheFor(references)
  const cacheKey = `${importerFilename}\u0000${imported.source}\u0000${exportedName}\u0000${method}`
  if (cache.has(cacheKey)) {
    return Option.fromNullishOr(cache.get(cacheKey))
  }

  const sourceFile = sourceFileForModule(importerFilename, imported.source)
  if (Option.isNone(sourceFile)) {
    cache.set(cacheKey, undefined)
    return Option.none()
  }

  const source = sanitizedModuleSource(readFileSync(sourceFile.value, 'utf8'))
  const ownerName = directlyExportedDefinitionMethodOwner(
    source,
    exportedName,
    method,
  )
  const owner = Option.map(ownerName, name => ({
    source: imported.source,
    members: [name],
  }))
  cache.set(cacheKey, Option.getOrUndefined(owner))
  return owner
}

const isObjectPattern = (node: unknown): node is ESTree.ObjectPattern =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectPattern'

const isFocusedMessageAdapterPath = (
  path: StaticMemberPath,
  method: string,
): boolean =>
  Array.contains(
    ['makeFieldsStep', 'makeCommandsStep', 'makeOutMessageStep'],
    method,
  ) &&
  Option.contains(Array.last(path.members), 'fromMessage') &&
  (Array.length(path.members) === 1 ||
    Option.contains(
      Array.get(path.members, Array.length(path.members) - 2),
      method,
    ))

const localDefinitionMethodOwner = (
  references: WeakMap<ESTree.Node, Reference>,
  helper: ESTree.IdentifierReference,
  method: string,
  importerFilename: string | undefined,
  visited: ReadonlySet<Variable>,
): Option.Option<DefinitionMethodOwner> =>
  Option.gen(function* () {
    const variable = yield* resolvedVariable(references, helper)
    if (visited.has(variable) || Array.length(variable.defs) !== 1) {
      return yield* Option.none()
    }

    const nextVisited = new Set([...visited, variable])
    const [definition] = variable.defs
    if (definition?.type === 'ImportBinding') {
      const imported = yield* resolveImportedPath(references, helper)
      const importedPath = yield* importedDefinitionMethodOwner(
        references,
        importerFilename,
        imported,
        method,
      )
      return {
        importedPath,
        isFromMessageAdapter: false,
        path: { root: helper, members: [] },
      }
    }

    if (
      definition?.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isVariableDeclaration(definition.node.parent) ||
      definition.node.parent.kind !== 'const'
    ) {
      return yield* Option.none()
    }

    if (isIdentifier(definition.node.id)) {
      const initializer = yield* Option.fromNullishOr(definition.node.init)
      const aliasPath = yield* staticMemberPath(initializer)
      const directOwner = definitionMethodOwnerPath(initializer, method)
      if (Option.isSome(directOwner)) {
        if (!isOwnedDefinitionPath(directOwner.value, references)) {
          return yield* Option.none()
        }

        return {
          importedPath: Option.getOrUndefined(
            importedOwnerForPath(references, directOwner.value),
          ),
          isFromMessageAdapter: isFocusedMessageAdapterPath(aliasPath, method),
          path: directOwner.value,
        }
      }

      const isFocusedAdapter =
        isFocusedMessageAdapterPath(aliasPath, method) &&
        Array.length(aliasPath.members) === 1 &&
        Option.contains(Array.head(aliasPath.members), 'fromMessage')
      if (
        Array.isReadonlyArrayNonEmpty(aliasPath.members) &&
        !isFocusedAdapter
      ) {
        return yield* Option.none()
      }

      const owner = yield* localDefinitionMethodOwner(
        references,
        aliasPath.root,
        method,
        importerFilename,
        nextVisited,
      )
      return isFocusedAdapter ? { ...owner, isFromMessageAdapter: true } : owner
    }

    if (!isObjectPattern(definition.node.id)) {
      return yield* Option.none()
    }

    const ownsHelper = definition.node.id.properties.some(
      property =>
        property.type === 'Property' &&
        Option.contains(staticPropertyName(property), method) &&
        isIdentifier(property.value, helper.name),
    )
    if (!ownsHelper) {
      return yield* Option.none()
    }

    const initializer = yield* Option.fromNullishOr(definition.node.init)
    const path = yield* staticMemberPath(initializer)
    if (!isOwnedDefinitionPath(path, references)) {
      return yield* Option.none()
    }

    return {
      importedPath: Option.getOrUndefined(
        importedOwnerForPath(references, path),
      ),
      isFromMessageAdapter: false,
      path,
    }
  })

const isOwnedDefinitionPath = (
  path: StaticMemberPath,
  references: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const importedOwner = resolveImportedPath(references, path.root)
  if (Option.isSome(importedOwner)) {
    const { source } = importedOwner.value
    return (
      source.startsWith('.') ||
      source.startsWith('@/') ||
      source.startsWith('~/')
    )
  }

  const isOwnedVariable = (
    variable: Variable,
    visited: ReadonlySet<Variable> = new Set(),
  ): boolean => {
    if (visited.has(variable)) {
      return false
    }

    const isOwnedStage = (call: ESTree.CallExpression): boolean => {
      if (
        Option.exists(
          resolveFoldkitApiPath(references, call.callee),
          apiPath => {
            const resolvedPath = Array.join(apiPath, '.')
            return (
              resolvedPath === 'Block.makeDefinition' ||
              resolvedPath === 'Block.makeNamespace'
            )
          },
        )
      ) {
        return true
      }

      if (
        isMemberExpression(call.callee) &&
        Option.exists(staticMemberName(call.callee), member =>
          Array.contains(['makeDefinition', 'makeComposition'], member),
        ) &&
        isCallExpression(call.callee.object)
      ) {
        return isOwnedStage(call.callee.object)
      }

      return Option.exists(
        staticMemberPath(call.callee),
        definePath =>
          Option.exists(Array.last(definePath.members), methodName =>
            Array.contains(['makeDefinition', 'makeComposition'], methodName),
          ) &&
          Option.exists(resolvedVariable(references, definePath.root), owner =>
            isOwnedVariable(owner, new Set([...visited, variable])),
          ),
      )
    }

    return variable.defs.some(
      definition =>
        definition.type === 'Variable' &&
        isVariableDeclarator(definition.node) &&
        isCallExpression(definition.node.init) &&
        isOwnedStage(definition.node.init),
    )
  }

  return Option.exists(resolvedVariable(references, path.root), isOwnedVariable)
}

/** Resolves an authoring method back to its proven Definition owner. */
export const ownedDefinitionMethodOwner = (
  callee: unknown,
  method: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  importerFilename?: string,
): Option.Option<DefinitionMethodOwner> => {
  const directOwner = definitionMethodOwnerPath(callee, method)
  if (Option.isSome(directOwner)) {
    if (references === undefined) {
      return Option.some({
        importedPath: undefined,
        isFromMessageAdapter: Option.exists(staticMemberPath(callee), path =>
          isFocusedMessageAdapterPath(path, method),
        ),
        path: directOwner.value,
      })
    }
    if (!isOwnedDefinitionPath(directOwner.value, references)) {
      return Option.none()
    }
    return Option.some({
      importedPath: Option.getOrUndefined(
        importedOwnerForPath(references, directOwner.value),
      ),
      isFromMessageAdapter: Option.exists(staticMemberPath(callee), path =>
        isFocusedMessageAdapterPath(path, method),
      ),
      path: directOwner.value,
    })
  }

  if (references === undefined) {
    return Option.none()
  }

  return Option.flatMap(staticMemberPath(callee), path => {
    const isFocusedAdapter =
      isFocusedMessageAdapterPath(path, method) &&
      Array.length(path.members) === 1 &&
      Option.contains(Array.head(path.members), 'fromMessage')
    if (!Array.isReadonlyArrayEmpty(path.members) && !isFocusedAdapter) {
      return Option.none()
    }

    return Option.map(
      localDefinitionMethodOwner(
        references,
        path.root,
        method,
        importerFilename,
        new Set(),
      ),
      owner =>
        isFocusedAdapter ? { ...owner, isFromMessageAdapter: true } : owner,
    )
  })
}

/** Recognizes an authoring method on a Block or imported feature owner. */
export const isOwnedDefinitionCallee = (
  callee: unknown,
  method: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  importerFilename?: string,
): boolean =>
  Option.isSome(
    ownedDefinitionMethodOwner(callee, method, references, importerFilename),
  )

export const isOwnedDefinitionCall = (
  node: ESTree.CallExpression,
  method: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  importerFilename?: string,
): boolean =>
  isOwnedDefinitionCallee(node.callee, method, references, importerFilename)
