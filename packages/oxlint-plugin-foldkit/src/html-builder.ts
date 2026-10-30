import { Array, Option } from 'effect'
import type { ESTree, Reference, Variable } from 'effect-oxlint'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

import { blockImplementationPath } from './block-implementation.ts'
import {
  calleeMatchesHelperName,
  isIdentifier,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
} from './guards.ts'

const VIEW_BUILDER_PARAMETER_INDEX = 1

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

const sourceFileForModule = (
  importerFilename: string,
  source: string,
): Option.Option<string> =>
  Array.findFirst(moduleCandidates(importerFilename, source), existsSync)

const htmlBuilderTypeNames = (
  source: SanitizedModuleSource,
): ReadonlyArray<string> => {
  const typeNames: Array<string> = []

  const namespaceImports = source.text.matchAll(
    /^\s*import\s+(?:type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/gmu,
  )
  for (const namespaceImport of namespaceImports) {
    const [, localName, sourceMarker] = namespaceImport
    if (
      localName !== undefined &&
      sourceMarker !== undefined &&
      Option.contains(moduleSourceValue(source, sourceMarker), 'foldkit/html')
    ) {
      typeNames.push(`${escapedRegExp(localName)}\\.HtmlBuilder`)
    }
  }

  const namedImports = source.text.matchAll(
    /^\s*import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gmu,
  )
  for (const namedImport of namedImports) {
    const [, specifiers, sourceMarker] = namedImport
    if (specifiers === undefined || sourceMarker === undefined) {
      continue
    }

    const importSource = moduleSourceValue(source, sourceMarker)
    for (const specifier of specifiers.split(',')) {
      const match = specifier
        .trim()
        .match(
          /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/u,
        )
      const importedName = match?.[1]
      const localName = match?.[2] ?? importedName
      if (importedName === undefined || localName === undefined) {
        continue
      }

      if (
        importedName === 'HtmlBuilder' &&
        Option.contains(importSource, 'foldkit/html')
      ) {
        typeNames.push(escapedRegExp(localName))
      }

      if (importedName === 'Html' && Option.contains(importSource, 'foldkit')) {
        typeNames.push(`${escapedRegExp(localName)}\\.HtmlBuilder`)
      }
    }
  }

  return typeNames
}

const directlyExportsFoldkitViewBuilder = (
  source: SanitizedModuleSource,
  exportedName: string,
): boolean =>
  htmlBuilderTypeNames(source).some(typeName =>
    new RegExp(
      `^\\s*export\\s+type\\s+${escapedRegExp(exportedName)}\\s*=\\s*${typeName}\\s*<`,
      'mu',
    ).test(source.text),
  )

type Reexport = Readonly<{ importedName: string; source: string }>

type ImportedViewBuilderProvenanceCache = Map<string, boolean>

const importedViewBuilderProvenanceCaches = new WeakMap<
  WeakMap<ESTree.Node, Reference>,
  ImportedViewBuilderProvenanceCache
>()

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
        namespace === 'Html' &&
        typeName === 'HtmlBuilder'
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

const isBlockViewFunction = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean =>
  Option.exists(blockImplementationPath(functionNode, references), path => {
    const [slot, extra] = path
    return slot === 'view' && extra === undefined
  })

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
          Array.get(definition.node.params, VIEW_BUILDER_PARAMETER_INDEX),
          parameter => parameter === definition.name,
        ) && isBlockViewFunction(references, definition.node)
      )
    }),
  )

/** Recognizes a member of a Foldkit HTML builder: an `HtmlBuilder`-typed
 *  parameter (directly or through a type alias), the `h` parameter of a Block
 *  `view`, or `inertHtml`. */
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
