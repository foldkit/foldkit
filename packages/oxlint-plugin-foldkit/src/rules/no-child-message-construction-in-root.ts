import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import {
  type ImportedPath,
  type StaticMemberPath,
  indexReferences,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isVariableDeclaration,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
} from '../guards.ts'

const pascalIdentifierPattern = /^[A-Z][A-Za-z0-9]*$/

const childMessageConstructionMessage = (calleeLabel: string): string =>
  `Do not construct the child Message \`${calleeLabel}(...)\` from a parent. Pass a received child Message to \`child.fold(model, message)\`. For parent-driven behavior, expose a named Step through the child Block's \`expose\` record and call the projected operation, such as \`child.clearSelection()(model)\`. Child-owned views, Steps, Commands, and Subscriptions may construct their own Messages.`

type ImportedMessagePath = Pick<ImportedPath, 'source' | 'members'>

type ChildMessageConstruction = Readonly<{
  calleeLabel: string
  messagePath?: ImportedMessagePath
}>

const moduleExtensionPattern = /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/

const moduleSegmentName = (segment: string): string =>
  segment.replace(moduleExtensionPattern, '')

const messageModuleSegmentNames: ReadonlySet<string> = new Set([
  'index',
  'main',
  'message',
  'schema',
])

const isMessageModuleSegment = (segment: string | undefined): boolean =>
  segment !== undefined &&
  messageModuleSegmentNames.has(moduleSegmentName(segment).toLowerCase())

const isFunction = (
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

const isTypeAnnotatedIdentifier = (
  node: unknown,
): node is Readonly<{
  type: 'Identifier'
  typeAnnotation?: ESTree.TSTypeAnnotation | null
}> => isIdentifier(node)

const importedMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ImportedMessagePath> =>
  isTypeReference(node)
    ? Option.map(resolveImportedPath(references, node.typeName), path => ({
        source: path.source,
        members: path.members,
      }))
    : Option.none()

const pascalCaseModuleSegment = (segment: string): string =>
  moduleSegmentName(segment)
    .split(/[-_]/)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')

const messageModuleSegments = (
  path: ImportedMessagePath,
): ReadonlyArray<string> => {
  const sourceSegments = path.source
    .split('/')
    .filter(segment => segment !== '.')
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const moduleSourceSegments = isMessageModuleSegment(lastSourceSegment)
    ? sourceSegments.slice(0, -1)
    : sourceSegments
  const namespaceMembers = path.members.slice(0, -1)
  const [firstNamespaceMember] = namespaceMembers
  const [moduleSourceName] = moduleSourceSegments.slice(-1)
  const remainingNamespaceMembers =
    firstNamespaceMember !== undefined &&
    moduleSourceName !== undefined &&
    pascalCaseModuleSegment(firstNamespaceMember) ===
      pascalCaseModuleSegment(moduleSourceName)
      ? namespaceMembers.slice(1)
      : namespaceMembers

  return [...moduleSourceSegments, ...remainingNamespaceMembers].map(
    pascalCaseModuleSegment,
  )
}

const sameSegments = (
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): boolean =>
  Array.length(a) === Array.length(b) &&
  Array.every(Array.zip(a, b), ([aSegment, bSegment]) => aSegment === bSegment)

const sameImportedMessagePath = (
  a: ImportedMessagePath,
  b: ImportedMessagePath,
): boolean => {
  if (a.source === b.source && sameSegments(a.members, b.members)) {
    return true
  }

  const aSegments = messageModuleSegments(a)
  const bSegments = messageModuleSegments(b)

  return sameSegments(aSegments, bSegments)
}

const directHtmlBuilderMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  typeAnnotation: unknown,
): Option.Option<ImportedMessagePath> => {
  if (!isTypeReference(typeAnnotation)) {
    return Option.none()
  }

  const isHtmlBuilder = Option.exists(
    resolveFoldkitApiPath(references, typeAnnotation.typeName),
    path => {
      const [namespace, typeName, extraMember] = path
      return (
        namespace === 'Html' &&
        typeName === 'HtmlBuilder' &&
        extraMember === undefined
      )
    },
  )
  if (!isHtmlBuilder) {
    return Option.none()
  }

  return Option.gen(function* () {
    const typeArguments = yield* Option.fromNullishOr(
      typeAnnotation.typeArguments,
    )
    const messageType = yield* Option.fromNullishOr(typeArguments.params[0])
    return yield* importedMessagePath(references, messageType)
  })
}

const isTypeAliasDeclaration = (
  node: unknown,
): node is ESTree.TSTypeAliasDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeAliasDeclaration'

const isIndexedAccessType = (
  node: unknown,
): node is ESTree.TSIndexedAccessType =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSIndexedAccessType'

const isTypeQuery = (node: unknown): node is ESTree.TSTypeQuery =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeQuery'

const isNumberLiteral = (node: unknown, value: number): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  node.value === value

const isNumberLiteralType = (node: unknown, value: number): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSLiteralType' &&
  'literal' in node &&
  isNumberLiteral(node.literal, value)

const parametersArgumentAt = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
  index: number,
): Option.Option<ESTree.TSType> => {
  if (
    !isIndexedAccessType(node) ||
    !isNumberLiteralType(node.indexType, index)
  ) {
    return Option.none()
  }

  const parametersType = node.objectType
  if (!isTypeReference(parametersType)) {
    return Option.none()
  }

  return Option.gen(function* () {
    const path = yield* staticMemberPath(parametersType.typeName)
    if (
      path.root.name !== 'Parameters' ||
      Array.isReadonlyArrayNonEmpty(path.members) ||
      Option.isSome(resolvedVariable(references, path.root))
    ) {
      return yield* Option.none()
    }

    const typeArguments = yield* Option.fromNullishOr(
      parametersType.typeArguments,
    )
    if (Array.length(typeArguments.params) !== 1) {
      return yield* Option.none()
    }

    return yield* Array.head(typeArguments.params)
  })
}

const applicationViewDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  builderType: unknown,
): Option.Option<ImportedMessagePath> =>
  Option.gen(function* () {
    const viewParameters = yield* parametersArgumentAt(
      references,
      builderType,
      1,
    )
    const view = yield* parametersArgumentAt(references, viewParameters, 0)
    if (!isTypeQuery(view)) {
      return yield* Option.none()
    }

    const path = yield* resolveImportedPathThroughConst(
      references,
      view.exprName,
    )
    if (!Option.contains(Array.last(path.members), 'makeView')) {
      return yield* Option.none()
    }

    const members = path.members.slice(0, -1)
    if (Array.isReadonlyArrayEmpty(members)) {
      return yield* Option.none()
    }

    return { source: path.source, members }
  })

const compositionHtmlBuilderDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  builderType: unknown,
): Option.Option<ImportedMessagePath> => {
  if (!isTypeReference(builderType)) {
    return Option.none()
  }

  const isCompositionHtmlBuilder = Option.exists(
    resolveFoldkitApiPath(references, builderType.typeName),
    path => {
      const [namespace, typeName, extraMember] = path
      return (
        namespace === 'Block' &&
        typeName === 'ViewBuilderFor' &&
        extraMember === undefined
      )
    },
  )
  if (!isCompositionHtmlBuilder) {
    return Option.none()
  }

  return Option.gen(function* () {
    const typeArguments = yield* Option.fromNullishOr(builderType.typeArguments)
    if (Array.length(typeArguments.params) !== 1) {
      return yield* Option.none()
    }

    const compositionType = yield* Array.head(typeArguments.params)
    if (!isTypeQuery(compositionType)) {
      return yield* Option.none()
    }

    const path = yield* resolveImportedPathThroughConst(
      references,
      compositionType.exprName,
    )
    if (Array.isReadonlyArrayEmpty(path.members)) {
      return yield* Option.none()
    }

    return { source: path.source, members: path.members }
  })
}

const directOwnedBuilderDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  typeAnnotation: unknown,
): Option.Option<ImportedMessagePath> => {
  const applicationViewPath = applicationViewDefinitionPath(
    references,
    typeAnnotation,
  )
  if (Option.isSome(applicationViewPath)) {
    return applicationViewPath
  }

  return compositionHtmlBuilderDefinitionPath(references, typeAnnotation)
}

const importedViewBuilderDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  typeAnnotation: unknown,
): Option.Option<ImportedMessagePath> => {
  if (!isTypeReference(typeAnnotation)) {
    return Option.none()
  }

  return Option.gen(function* () {
    const path = yield* resolveImportedPath(references, typeAnnotation.typeName)
    if (
      !Option.exists(Array.last(path.members), name =>
        name.endsWith('ViewBuilder'),
      )
    ) {
      return yield* Option.none()
    }

    return { source: path.source, members: path.members.slice(0, -1) }
  })
}

const aliasedOwnedBuilderDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  typeAnnotation: unknown,
): Option.Option<ImportedMessagePath> => {
  if (!isTypeReference(typeAnnotation)) {
    return Option.none()
  }

  const importedViewBuilderPath = importedViewBuilderDefinitionPath(
    references,
    typeAnnotation,
  )
  if (Option.isSome(importedViewBuilderPath)) {
    return importedViewBuilderPath
  }

  return Option.gen(function* () {
    const path = yield* staticMemberPath(typeAnnotation.typeName)
    if (Array.isReadonlyArrayNonEmpty(path.members)) {
      return yield* Option.none()
    }

    const variable = yield* resolvedVariable(references, path.root)
    const definition = yield* Array.findFirst(variable.defs, entry =>
      isTypeAliasDeclaration(entry.node),
    )
    if (!isTypeAliasDeclaration(definition.node)) {
      return yield* Option.none()
    }

    return yield* directOwnedBuilderDefinitionPath(
      references,
      definition.node.typeAnnotation,
    )
  })
}

type DefinitionOperation = Readonly<{
  importedDefinitionPath: ImportedMessagePath | undefined
  members: ReadonlyArray<string>
  operation:
    | 'bindChild'
    | 'command'
    | 'managedResources'
    | 'mount'
    | 'mountStream'
    | 'render'
    | 'resource'
    | 'step'
    | 'subscriptions'
    | 'update'
    | 'view'
  root: ESTree.IdentifierReference
}>

const definitionOperationName = (
  method: string,
  maybePreviousMethod: Option.Option<string>,
): DefinitionOperation['operation'] | undefined => {
  if (
    method === 'withInputs' &&
    Option.contains(maybePreviousMethod, 'makeView')
  ) {
    return 'view'
  }
  if (method === 'makeUpdate') {
    return 'update'
  }
  if (method === 'makeView') {
    return 'view'
  }
  if (
    method === 'bindChild' ||
    method === 'command' ||
    method === 'managedResources' ||
    method === 'mount' ||
    method === 'mountStream' ||
    method === 'render' ||
    method === 'resource' ||
    method === 'step' ||
    method === 'subscriptions'
  ) {
    return method
  }
  return undefined
}

const compositionDefinitionPath = (
  references: WeakMap<ESTree.Node, Reference>,
  path: StaticMemberPath,
  visited: ReadonlySet<Variable> = new Set(),
): StaticMemberPath => {
  if (Array.isReadonlyArrayNonEmpty(path.members)) {
    return path
  }

  return Option.gen(function* () {
    const variable = yield* resolvedVariable(references, path.root)
    if (visited.has(variable) || Array.length(variable.defs) !== 1) {
      return yield* Option.none()
    }

    const [definition] = variable.defs
    if (
      definition === undefined ||
      definition.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isVariableDeclaration(definition.node.parent) ||
      definition.node.parent.kind !== 'const'
    ) {
      return yield* Option.none()
    }

    const initializer = yield* Option.fromNullishOr(definition.node.init)
    const nextVisited = new Set([...visited, variable])
    if (!isCallExpression(initializer)) {
      const aliasPath = yield* staticMemberPath(initializer)
      return compositionDefinitionPath(references, aliasPath, nextVisited)
    }

    const compositionCall = yield* staticMemberPath(initializer.callee)
    if (
      !Option.contains(Array.last(compositionCall.members), 'makeComposition')
    ) {
      return yield* Option.none()
    }

    return compositionDefinitionPath(
      references,
      {
        root: compositionCall.root,
        members: compositionCall.members.slice(0, -1),
      },
      nextVisited,
    )
  }).pipe(Option.getOrElse(() => path))
}

const definitionOperation = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): Option.Option<DefinitionOperation> => {
  const parent = functionNode.parent
  if (!isCallExpression(parent) || !parent.arguments.includes(functionNode)) {
    return Option.none()
  }

  return Option.gen(function* () {
    const calleePath = yield* staticMemberPath(parent.callee)
    const method = yield* Array.last(calleePath.members)
    const maybePreviousMethod = Array.get(
      calleePath.members,
      Array.length(calleePath.members) - 2,
    )
    const isViewWithInputs =
      method === 'withInputs' &&
      Option.contains(maybePreviousMethod, 'makeView')
    const operation = definitionOperationName(method, maybePreviousMethod)
    if (operation === undefined) {
      return yield* Option.none()
    }

    const suffixLength = isViewWithInputs ? 2 : 1
    const definitionPath = compositionDefinitionPath(references, {
      root: calleePath.root,
      members: calleePath.members.slice(0, -suffixLength),
    })
    const importedDefinitionPath = Option.map(
      resolveImportedPathThroughConst(references, definitionPath.root),
      path => ({
        source: path.source,
        members: [...path.members, ...definitionPath.members],
      }),
    )

    return {
      importedDefinitionPath: Option.getOrUndefined(importedDefinitionPath),
      members: definitionPath.members,
      operation,
      root: definitionPath.root,
    }
  })
}

const localDefinitionMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  operation: DefinitionOperation,
): Option.Option<ImportedMessagePath> => {
  if (Array.isReadonlyArrayNonEmpty(operation.members)) {
    return Option.none()
  }

  return Option.gen(function* () {
    const variable = yield* resolvedVariable(references, operation.root)
    const definition = yield* Array.findFirst(
      variable.defs,
      entry =>
        entry.type === 'Variable' &&
        isVariableDeclarator(entry.node) &&
        isCallExpression(entry.node.init),
    )
    if (
      definition.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isCallExpression(definition.node.init)
    ) {
      return yield* Option.none()
    }

    const defineCall = definition.node.init
    const definePath = yield* staticMemberPath(defineCall.callee)
    if (!Option.contains(Array.last(definePath.members), 'define')) {
      return yield* Option.none()
    }

    const config = yield* Array.last(defineCall.arguments)
    if (!isObjectExpression(config)) {
      return yield* Option.none()
    }
    const message = yield* Array.findFirst(
      config.properties,
      property =>
        isObjectProperty(property) &&
        Option.contains(staticPropertyName(property), 'Message'),
    )
    if (!isObjectProperty(message)) {
      return yield* Option.none()
    }

    const imported = yield* resolveImportedPath(references, message.value)
    return { source: imported.source, members: imported.members }
  })
}

const importedDefinitionOwnsMessage = (
  definitionPath: ImportedMessagePath,
  messagePath: ImportedMessagePath,
): boolean => {
  const normalizedLocalSource = (
    source: string,
  ): Option.Option<ReadonlyArray<string>> => {
    const pathSegments = source.split('/')
    if (!source.startsWith('./') || pathSegments.includes('..')) {
      return Option.none()
    }

    return Option.some(
      pathSegments.filter(segment => segment !== '.').map(moduleSegmentName),
    )
  }
  const isSameSource =
    definitionPath.source === messagePath.source ||
    Option.exists(normalizedLocalSource(definitionPath.source), definition =>
      Option.exists(normalizedLocalSource(messagePath.source), message =>
        sameSegments(definition, message),
      ),
    )
  if (!isSameSource) {
    return false
  }

  if (
    sameSegments(messagePath.members, [...definitionPath.members, 'Message'])
  ) {
    return true
  }

  return sameSegments(messagePath.members, ['Message'])
}

const isLocalSiblingModule = (source: string, moduleName: string): boolean => {
  const pathSegments = source.split('/')
  if (pathSegments.includes('..')) {
    return false
  }

  const sourceSegments = pathSegments.filter(segment => segment !== '.')

  return (
    source.startsWith('./') &&
    Array.length(sourceSegments) === 1 &&
    Option.exists(
      Array.head(sourceSegments),
      segment => moduleSegmentName(segment) === moduleName,
    )
  )
}

const resolvedLocalModuleSegments = (
  filename: string,
  source: string,
): Option.Option<ReadonlyArray<string>> => {
  if (!source.startsWith('./') && !source.startsWith('../')) {
    return Option.none()
  }

  const containingDirectory = filename.split(/[\\/]/).slice(0, -1)
  const resolved = source.split('/').reduce<Option.Option<Array<string>>>(
    (maybeSegments, segment) =>
      Option.flatMap(maybeSegments, segments => {
        if (segment === '.') {
          return Option.some(segments)
        }

        if (segment === '..') {
          return Array.isReadonlyArrayNonEmpty(segments)
            ? Option.some(segments.slice(0, -1))
            : Option.none()
        }

        return Option.some([...segments, segment])
      }),
    Option.some(containingDirectory),
  )

  return Option.map(resolved, segments =>
    segments.map((segment, index) =>
      index === segments.length - 1 ? moduleSegmentName(segment) : segment,
    ),
  )
}

const featureDefinitionDirectory = (
  messagePath: ImportedMessagePath,
  filename: string,
): Option.Option<ReadonlyArray<string>> => {
  if (!sameSegments(messagePath.members, ['Message'])) {
    return Option.none()
  }

  return Option.gen(function* () {
    const messageModule = yield* resolvedLocalModuleSegments(
      filename,
      messagePath.source,
    )
    if (!Option.contains(Array.last(messageModule), 'definition')) {
      return yield* Option.none()
    }

    const definitionDirectory = messageModule.slice(0, -1)
    const currentDirectory = filename.split(/[\\/]/).slice(0, -1)
    const implementationDirectory = Option.getOrUndefined(
      Array.last(currentDirectory),
    )
    const isFeatureImplementationDirectory =
      implementationDirectory !== undefined &&
      Array.contains(
        ['composition', 'update', 'view'],
        implementationDirectory,
      ) &&
      sameSegments(currentDirectory.slice(0, -1), definitionDirectory)

    if (
      !sameSegments(currentDirectory, definitionDirectory) &&
      !isFeatureImplementationDirectory
    ) {
      return yield* Option.none()
    }

    return definitionDirectory
  })
}

const isFeatureCompositionModule = (
  compositionPath: ImportedMessagePath,
  definitionDirectory: ReadonlyArray<string>,
  filename: string,
): boolean =>
  Option.exists(
    resolvedLocalModuleSegments(filename, compositionPath.source),
    compositionModule => {
      const normalizedCompositionModule = Option.contains(
        Array.last(compositionModule),
        'index',
      )
        ? compositionModule.slice(0, -1)
        : compositionModule
      const featureName = Option.getOrUndefined(Array.last(definitionDirectory))
      const directComposition = [...definitionDirectory, 'composition']
      const nestedComposition = [
        ...definitionDirectory,
        'composition',
        'composition',
      ]
      const legacyFeatureModule =
        featureName === undefined
          ? Option.none<ReadonlyArray<string>>()
          : Option.some([...definitionDirectory, featureName])

      return (
        sameSegments(normalizedCompositionModule, directComposition) ||
        sameSegments(normalizedCompositionModule, nestedComposition) ||
        Option.exists(legacyFeatureModule, legacyModule =>
          sameSegments(normalizedCompositionModule, legacyModule),
        )
      )
    },
  )

const importedCompositionOwnsDefinitionMessage = (
  compositionPath: ImportedMessagePath,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean => {
  const compositionName = Option.getOrUndefined(
    Array.last(compositionPath.members),
  )

  return (
    compositionName !== undefined &&
    compositionName.endsWith('Composition') &&
    Option.exists(
      featureDefinitionDirectory(messagePath, filename),
      definitionDirectory =>
        isFeatureCompositionModule(
          compositionPath,
          definitionDirectory,
          filename,
        ),
    )
  )
}

const importedViewBuilderOwnsDefinitionMessage = (
  implementationPath: ImportedMessagePath,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  Array.isReadonlyArrayEmpty(implementationPath.members) &&
  Option.exists(
    featureDefinitionDirectory(messagePath, filename),
    definitionDirectory =>
      isFeatureCompositionModule(
        implementationPath,
        definitionDirectory,
        filename,
      ),
  ) &&
  sameSegments(messagePath.members, ['Message'])

const importedOwnerOwnsMessage = (
  ownerPath: ImportedMessagePath,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  importedDefinitionOwnsMessage(ownerPath, messagePath) ||
  importedCompositionOwnsDefinitionMessage(ownerPath, messagePath, filename)

const definitionOperationOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  Option.exists(definitionOperation(references, functionNode), operation => {
    const ownsLocalMessage = Option.exists(
      localDefinitionMessagePath(references, operation),
      definitionMessagePath =>
        sameImportedMessagePath(definitionMessagePath, messagePath),
    )
    if (ownsLocalMessage) {
      return true
    }

    return (
      operation.importedDefinitionPath !== undefined &&
      importedOwnerOwnsMessage(
        operation.importedDefinitionPath,
        messagePath,
        filename,
      )
    )
  })

const annotatedBuilderOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  parameter: unknown,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean => {
  if (!isTypeAnnotatedIdentifier(parameter)) {
    return false
  }

  const typeAnnotation = parameter.typeAnnotation?.typeAnnotation
  const directMessagePath = directHtmlBuilderMessagePath(
    references,
    typeAnnotation,
  )
  if (
    Option.exists(directMessagePath, builderMessagePath =>
      sameImportedMessagePath(builderMessagePath, messagePath),
    )
  ) {
    return true
  }

  const importedViewBuilderPath = importedViewBuilderDefinitionPath(
    references,
    typeAnnotation,
  )
  if (
    Option.exists(importedViewBuilderPath, path =>
      importedViewBuilderOwnsDefinitionMessage(path, messagePath, filename),
    )
  ) {
    return true
  }

  const directDefinitionPath = directOwnedBuilderDefinitionPath(
    references,
    typeAnnotation,
  )
  const definitionPath = Option.isSome(directDefinitionPath)
    ? directDefinitionPath
    : aliasedOwnedBuilderDefinitionPath(references, typeAnnotation)

  return Option.exists(definitionPath, path =>
    importedOwnerOwnsMessage(path, messagePath, filename),
  )
}

const importedOperationOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  operationCall: ESTree.CallExpression,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  Option.exists(
    resolveImportedPathThroughConst(references, operationCall.callee),
    path => {
      const operation = Option.getOrUndefined(Array.last(path.members))
      const previousOperation = Option.getOrUndefined(
        Array.get(path.members, Array.length(path.members) - 2),
      )
      const isViewWithInputs =
        operation === 'withInputs' && previousOperation === 'makeView'
      const isDefinitionOperation =
        operation !== undefined &&
        definitionOperationName(
          operation,
          Option.fromNullishOr(previousOperation),
        ) !== undefined
      const isCompletion =
        operation === 'makeApplication' ||
        operation === 'makeBlock' ||
        operation === 'makeElement'
      if (!isDefinitionOperation && !isViewWithInputs && !isCompletion) {
        return false
      }

      const suffixLength = isViewWithInputs ? 2 : 1
      const members = path.members.slice(0, -suffixLength)
      return (
        Array.isReadonlyArrayNonEmpty(members) &&
        importedOwnerOwnsMessage(
          { source: path.source, members },
          messagePath,
          filename,
        )
      )
    },
  )

const isOwnedByEnclosingOperation = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference>,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean => {
  const ownsMessage = (
    ancestor: ESTree.Node | null | undefined,
    descendant: ESTree.Node,
  ): boolean => {
    if (ancestor === null || ancestor === undefined) {
      return false
    }

    if (isFunction(ancestor)) {
      const ownsAnnotatedBuilder = ancestor.params.some(parameter =>
        annotatedBuilderOwnsMessage(
          references,
          parameter,
          messagePath,
          filename,
        ),
      )
      if (ownsAnnotatedBuilder) {
        return true
      }

      if (
        definitionOperationOwnsMessage(
          references,
          ancestor,
          messagePath,
          filename,
        )
      ) {
        return true
      }
    }

    if (
      isCallExpression(ancestor) &&
      ancestor.arguments.some(
        argument =>
          argument === descendant &&
          (isFunction(descendant) || isObjectExpression(descendant)),
      ) &&
      importedOperationOwnsMessage(references, ancestor, messagePath, filename)
    ) {
      return true
    }

    return ownsMessage(ancestor.parent, ancestor)
  }

  return ownsMessage(node.parent, node)
}

const hasComputedMember = (node: unknown): boolean =>
  isMemberExpression(node) && (node.computed || hasComputedMember(node.object))

const relativeModuleSegments = (source: string): ReadonlyArray<string> =>
  source.split('/').filter(segment => segment !== '.' && segment !== '..')

const isTopLevelRootAlias = (source: string): boolean => {
  if (!source.startsWith('@/') && !source.startsWith('~/')) {
    return false
  }

  return !source.slice(2).includes('/')
}

const isRootMessageModule = (source: string): boolean => {
  if (isLocalSiblingModule(source, 'definition')) {
    return true
  }

  const sourceSegments = relativeModuleSegments(source)
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const [parentSourceSegment] = sourceSegments.slice(-2, -1)

  if (lastSourceSegment === undefined) {
    return true
  }

  if (!isMessageModuleSegment(lastSourceSegment)) {
    return false
  }

  return source.startsWith('.')
    ? parentSourceSegment === undefined
    : isTopLevelRootAlias(source)
}

const childNamespace = (
  source: string,
  importedMembers: ReadonlyArray<string>,
  localMembers: ReadonlyArray<string>,
): string => {
  const namespaceMembers = importedMembers.slice(0, -2)
  const [importedNamespace] = namespaceMembers.slice(-1)
  if (importedNamespace !== undefined) {
    return importedNamespace
  }

  const sourceSegments = relativeModuleSegments(source)
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const [parentSourceSegment] = sourceSegments.slice(-2, -1)
  const sourceNamespace = isMessageModuleSegment(lastSourceSegment)
    ? parentSourceSegment
    : lastSourceSegment
  if (sourceNamespace !== undefined) {
    return pascalCaseModuleSegment(sourceNamespace)
  }

  const [localRoot] = localMembers
  return localRoot ?? 'Child'
}

const resolveImportedPathThroughConst = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
  visited: ReadonlySet<Variable> = new Set(),
): Option.Option<ImportedPath> => {
  const importedPath = resolveImportedPath(references, node)
  if (Option.isSome(importedPath)) {
    return importedPath
  }

  return Option.gen(function* () {
    const path = yield* staticMemberPath(node)
    const variable = yield* resolvedVariable(references, path.root)
    if (visited.has(variable) || Array.length(variable.defs) !== 1) {
      return yield* Option.none()
    }

    const [definition] = variable.defs
    if (
      definition === undefined ||
      definition.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isVariableDeclaration(definition.node.parent) ||
      definition.node.parent.kind !== 'const' ||
      !isIdentifier(definition.node.id)
    ) {
      return yield* Option.none()
    }

    const initializer = yield* Option.fromNullishOr(definition.node.init)
    const resolved = yield* resolveImportedPathThroughConst(
      references,
      initializer,
      new Set([...visited, variable]),
    )

    return {
      source: resolved.source,
      members: [...resolved.members, ...path.members],
      localMembers: [path.root.name, ...path.members],
    }
  })
}

const childMessageConstruction = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ChildMessageConstruction> => {
  if (hasComputedMember(callee)) {
    return Option.none()
  }

  if (references === undefined) {
    return Option.flatMap(staticMemberPath(callee), path => {
      const [namespace, middle, constructorName, extraSegment] = [
        path.root.name,
        ...path.members,
      ]
      return namespace !== undefined &&
        middle === 'Message' &&
        constructorName !== undefined &&
        constructorName !== 'Message' &&
        extraSegment === undefined &&
        pascalIdentifierPattern.test(namespace) &&
        pascalIdentifierPattern.test(constructorName)
        ? Option.some({
            calleeLabel: `${namespace}.Message.${constructorName}`,
          })
        : Option.none()
    })
  }

  return Option.flatMap(
    resolveImportedPathThroughConst(references, callee),
    path => {
      const [messageNamespace, constructorName] = path.members.slice(-2)
      if (
        messageNamespace !== 'Message' ||
        constructorName === undefined ||
        constructorName === 'Message' ||
        !pascalIdentifierPattern.test(constructorName) ||
        isRootMessageModule(path.source)
      ) {
        return Option.none()
      }

      return Option.some({
        calleeLabel: `${childNamespace(path.source, path.members, path.localMembers)}.Message.${constructorName}`,
        messagePath: {
          source: path.source,
          members: path.members.slice(0, -1),
        },
      })
    },
  )
}

/**
 * Flags construction of a child Block Message variant from outside the
 * child, such as Chat.Message.ClickedOpen(...) or an immutable local alias.
 */
export const noChildMessageConstructionInRoot = Rule.define({
  name: 'no-child-message-construction-in-root',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Drive child Blocks through child-owned update capabilities instead of constructing their Messages from a parent.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          childMessageConstruction(node.callee, references),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ calleeLabel, messagePath }) => {
              if (
                references !== undefined &&
                messagePath !== undefined &&
                isOwnedByEnclosingOperation(
                  node,
                  references,
                  messagePath,
                  ctx.filename,
                )
              ) {
                return Effect.void
              }

              return ctx.report(
                Diagnostic.make({
                  node,
                  message: childMessageConstructionMessage(calleeLabel),
                }),
              )
            },
          }),
        )
      },
    }
  },
})
