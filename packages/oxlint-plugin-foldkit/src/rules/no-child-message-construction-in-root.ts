import { Array, Effect, Option } from 'effect'
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
  blockBindingParent,
  indexReferences,
  isBlockBindingCall,
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isOwnedDefinitionCallee,
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
  `Do not construct the child Message \`${calleeLabel}(...)\` from a parent. Generated child delivery is owned by the registered Binding. For parent-driven behavior, expose the local Message constructor through the child Block's \`operations\` record and call the named Binding method, such as \`child.requestClearSelection()(model)\`. Child-owned views, Steps, Commands, and Subscriptions may construct their own Messages.`

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

const viewDefinitionPath = (
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
  const viewPath = viewDefinitionPath(references, typeAnnotation)
  if (Option.isSome(viewPath)) {
    return viewPath
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
    | 'makeBinding'
    | 'makeCommand'
    | 'makeCommandsStep'
    | 'makeFieldsStep'
    | 'makeOutMessageStep'
    | 'makeManagedResources'
    | 'makeMount'
    | 'makeMountStream'
    | 'render'
    | 'makeResource'
    | 'makeStep'
    | 'makeSubscriptions'
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
  if (
    method === 'withContext' &&
    Option.contains(maybePreviousMethod, 'makeUpdate')
  ) {
    return 'update'
  }
  if (method === 'makeUpdate') {
    return 'update'
  }
  if (method === 'makeView') {
    return 'view'
  }
  if (method === 'fromMessage') {
    return Option.getOrUndefined(
      Option.filter(
        maybePreviousMethod,
        previousMethod =>
          previousMethod === 'makeFieldsStep' ||
          previousMethod === 'makeCommandsStep' ||
          previousMethod === 'makeOutMessageStep',
      ),
    )
  }
  if (
    method === 'makeBinding' ||
    method === 'makeCommand' ||
    method === 'makeCommandsStep' ||
    method === 'makeFieldsStep' ||
    method === 'makeOutMessageStep' ||
    method === 'makeManagedResources' ||
    method === 'makeMount' ||
    method === 'makeMountStream' ||
    method === 'render' ||
    method === 'makeResource' ||
    method === 'makeStep' ||
    method === 'makeSubscriptions'
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

const definitionOperationForCall = (
  references: WeakMap<ESTree.Node, Reference>,
  parent: ESTree.CallExpression,
): Option.Option<DefinitionOperation> => {
  return Option.gen(function* () {
    if (isBlockBindingCall(parent, references)) {
      const bindingParent = yield* Option.fromNullishOr(
        blockBindingParent(parent, references),
      )
      const bindingParentPath = compositionDefinitionPath(
        references,
        yield* staticMemberPath(bindingParent),
      )
      const importedBindingParentPath = Option.map(
        resolveImportedPathThroughConst(references, bindingParentPath.root),
        path => ({
          source: path.source,
          members: [...path.members, ...bindingParentPath.members],
        }),
      )

      return {
        importedDefinitionPath: Option.getOrUndefined(
          importedBindingParentPath,
        ),
        members: bindingParentPath.members,
        operation: 'makeBinding',
        root: bindingParentPath.root,
      }
    }

    const calleePath = yield* staticMemberPath(parent.callee)
    const method = yield* Array.last(calleePath.members)
    const maybePreviousMethod = Array.get(
      calleePath.members,
      Array.length(calleePath.members) - 2,
    )
    const isViewWithInputs =
      method === 'withInputs' &&
      Option.contains(maybePreviousMethod, 'makeView')
    const isUpdateWithContext =
      method === 'withContext' &&
      Option.contains(maybePreviousMethod, 'makeUpdate')
    const operation = definitionOperationName(method, maybePreviousMethod)
    if (operation === undefined) {
      return yield* Option.none()
    }
    const isFocusedStep =
      operation === 'makeFieldsStep' ||
      operation === 'makeCommandsStep' ||
      operation === 'makeOutMessageStep'
    if (
      isFocusedStep &&
      !isOwnedDefinitionCallee(parent.callee, operation, references)
    ) {
      return yield* Option.none()
    }

    if (
      operation === 'update' &&
      !isUpdateWithContext &&
      !isOwnedDefinitionCallee(parent.callee, 'makeUpdate', references)
    ) {
      return yield* Option.none()
    }
    if (
      isUpdateWithContext &&
      (!isMemberExpression(parent.callee) ||
        !isOwnedDefinitionCallee(
          parent.callee.object,
          'makeUpdate',
          references,
        ))
    ) {
      return yield* Option.none()
    }

    const suffixLength =
      isViewWithInputs ||
      isUpdateWithContext ||
      (isFocusedStep && method === 'fromMessage')
        ? 2
        : 1
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

const resolvedFunctionValue = (
  value: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): ESTree.ArrowFunctionExpression | ESTree.Function | undefined => {
  if (isFunction(value)) {
    return value
  }
  if (!isIdentifierReference(value)) {
    return undefined
  }

  const variable = Option.getOrUndefined(resolvedVariable(references, value))
  if (variable === undefined) {
    return undefined
  }

  for (const definition of variable.defs) {
    const definitionNode = definition.node
    if (isVariableDeclarator(definitionNode)) {
      if (isFunction(definitionNode.init)) {
        return definitionNode.init
      }
    } else if (isFunction(definitionNode)) {
      return definitionNode
    }
  }

  return undefined
}

const resolvedObjectValue = (
  value: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): ESTree.ObjectExpression | undefined => {
  if (isObjectExpression(value)) {
    return value
  }
  if (!isIdentifierReference(value)) {
    return undefined
  }

  const variable = Option.getOrUndefined(resolvedVariable(references, value))
  if (variable === undefined) {
    return undefined
  }

  for (const definition of variable.defs) {
    if (
      isVariableDeclarator(definition.node) &&
      isObjectExpression(definition.node.init)
    ) {
      return definition.node.init
    }
  }

  return undefined
}

const returnedExpressions = (
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlyArray<unknown> => {
  if (callback.body === null) {
    return []
  }
  if (callback.body.type !== 'BlockStatement') {
    return [callback.body]
  }

  return callback.body.body.flatMap(statement =>
    statement.type === 'ReturnStatement' && statement.argument !== null
      ? [statement.argument]
      : [],
  )
}

const ownedHandlerFunctions = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference>,
): ReadonlyArray<
  Readonly<{
    handler: ESTree.ArrowFunctionExpression | ESTree.Function
    operation: DefinitionOperation
  }>
> => {
  const operation = Option.getOrUndefined(
    definitionOperationForCall(references, node),
  )
  if (
    operation?.operation === 'makeFieldsStep' ||
    operation?.operation === 'makeCommandsStep' ||
    operation?.operation === 'makeOutMessageStep'
  ) {
    const [authored] = node.arguments
    const handler = resolvedFunctionValue(authored, references)
    return handler === undefined ? [] : [{ handler, operation }]
  }
  if (operation?.operation !== 'update') {
    return []
  }

  const maybePath = staticMemberPath(node.callee)
  if (Option.isNone(maybePath)) {
    return []
  }

  const [authored] = node.arguments
  const isWithContext =
    maybePath.value.members.slice(-2).join('.') === 'makeUpdate.withContext'
  const handlerObjects: Array<ESTree.ObjectExpression> = []
  if (isWithContext) {
    const createHandlers = resolvedFunctionValue(authored, references)
    if (createHandlers !== undefined) {
      for (const returned of returnedExpressions(createHandlers)) {
        const handlers = resolvedObjectValue(returned, references)
        if (handlers !== undefined) {
          handlerObjects.push(handlers)
        }
      }
    }
  } else {
    const handlers = resolvedObjectValue(authored, references)
    if (handlers !== undefined) {
      handlerObjects.push(handlers)
    }
  }

  return handlerObjects.flatMap(handlers =>
    handlers.properties.flatMap(property => {
      if (property.type !== 'Property') {
        return []
      }
      const handler = resolvedFunctionValue(property.value, references)
      return handler === undefined ? [] : [{ handler, operation }]
    }),
  )
}

const definitionOperation = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): Option.Option<DefinitionOperation> => {
  const parent = functionNode.parent
  if (!isCallExpression(parent) || !parent.arguments.includes(functionNode)) {
    return Option.none()
  }

  return definitionOperationForCall(references, parent)
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
    if (!Option.contains(Array.last(definePath.members), 'makeDefinition')) {
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

const operationOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  operation: DefinitionOperation,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean => {
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
}

const definitionOperationOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  Option.exists(definitionOperation(references, functionNode), operation =>
    operationOwnsMessage(references, operation, messagePath, filename),
  )

const definitionOperationCallOwnsMessage = (
  references: WeakMap<ESTree.Node, Reference>,
  operationCall: ESTree.CallExpression,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean =>
  Option.exists(
    definitionOperationForCall(references, operationCall),
    operation =>
      (operation.operation === 'update' ||
        operation.operation === 'makeBinding') &&
      operationOwnsMessage(references, operation, messagePath, filename),
  )

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
      const isUpdateWithContext =
        operation === 'withContext' && previousOperation === 'makeUpdate'
      const isFocusedStepFromMessage =
        operation === 'fromMessage' &&
        (previousOperation === 'makeFieldsStep' ||
          previousOperation === 'makeCommandsStep' ||
          previousOperation === 'makeOutMessageStep')
      const isDefinitionOperation =
        operation !== undefined &&
        definitionOperationName(
          operation,
          Option.fromNullishOr(previousOperation),
        ) !== undefined
      const isPreparation = operation === 'prepareBlock'
      if (
        !isDefinitionOperation &&
        !isViewWithInputs &&
        !isUpdateWithContext &&
        !isPreparation
      ) {
        return false
      }

      const suffixLength =
        isViewWithInputs || isUpdateWithContext || isFocusedStepFromMessage
          ? 2
          : 1
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
      (definitionOperationCallOwnsMessage(
        references,
        ancestor,
        messagePath,
        filename,
      ) ||
        importedOperationOwnsMessage(
          references,
          ancestor,
          messagePath,
          filename,
        ))
    ) {
      return true
    }

    return ownsMessage(ancestor.parent, ancestor)
  }

  return ownsMessage(node.parent, node)
}

const isWithinOwnedHandler = (
  node: ESTree.Node,
  ownedHandlers: WeakMap<ESTree.Node, ReadonlyArray<DefinitionOperation>>,
  references: WeakMap<ESTree.Node, Reference>,
  messagePath: ImportedMessagePath,
  filename: string,
): boolean => {
  const parent = node.parent
  if (parent === null || parent === undefined) {
    return false
  }
  const operations = isFunction(parent) ? ownedHandlers.get(parent) : undefined
  return (
    (operations !== undefined &&
      operations.every(operation =>
        operationOwnsMessage(references, operation, messagePath, filename),
      )) ||
    isWithinOwnedHandler(
      parent,
      ownedHandlers,
      references,
      messagePath,
      filename,
    )
  )
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
    const ownedHandlers = new WeakMap<
      ESTree.Node,
      ReadonlyArray<DefinitionOperation>
    >()
    const constructions: Array<
      Readonly<{
        node: ESTree.CallExpression
        construction: ChildMessageConstruction
      }>
    > = []

    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }

        if (references !== undefined) {
          for (const { handler, operation } of ownedHandlerFunctions(
            node,
            references,
          )) {
            ownedHandlers.set(handler, [
              ...(ownedHandlers.get(handler) ?? []),
              operation,
            ])
          }
        }

        const construction = Option.getOrUndefined(
          childMessageConstruction(node.callee, references),
        )
        if (construction === undefined) {
          return Effect.void
        }
        if (references === undefined) {
          return ctx.report(
            Diagnostic.make({
              node,
              message: childMessageConstructionMessage(
                construction.calleeLabel,
              ),
            }),
          )
        }

        constructions.push({ node, construction })

        return Effect.void
      },
      'Program:exit': () =>
        Effect.all(
          constructions.flatMap(({ node, construction }) => {
            const { calleeLabel, messagePath } = construction
            if (
              references !== undefined &&
              messagePath !== undefined &&
              (isOwnedByEnclosingOperation(
                node,
                references,
                messagePath,
                ctx.filename,
              ) ||
                isWithinOwnedHandler(
                  node,
                  ownedHandlers,
                  references,
                  messagePath,
                  ctx.filename,
                ))
            ) {
              return []
            }

            return [
              ctx.report(
                Diagnostic.make({
                  node,
                  message: childMessageConstructionMessage(calleeLabel),
                }),
              ),
            ]
          }),
          { discard: true },
        ),
    }
  },
})
