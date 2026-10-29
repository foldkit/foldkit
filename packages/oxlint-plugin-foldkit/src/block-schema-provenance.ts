import { Array, Option, Predicate } from 'effect'
import { type ESTree, type Reference, type Variable } from 'effect-oxlint'
import { readFileSync } from 'node:fs'
import { type ModuleExportName, parseSync } from 'oxc-parser'

import {
  isArrowFunction,
  isCallExpression,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isObjectProperty,
  isVariableDeclarator,
  resolveImportedPath,
  resolvedVariable,
  sourceFileForModule,
  staticMemberName,
  staticMemberPath,
  staticPropertyName,
} from './guards.ts'

type Stage =
  | 'Block'
  | 'Namespace'
  | 'Definition'
  | 'CompositionFactory'
  | 'Composition'
  | 'Assembly'
  | 'Completed'
  | 'Producer'
  | 'CheckedCompleted'

type SourceExpression =
  | Readonly<{ kind: 'ModelProjection'; receiver: SourceExpression }>
  | Readonly<{ kind: 'Widened'; value: SourceExpression }>
  | Readonly<{ kind: 'Producer'; body: SourceExpression; checked: boolean }>
  | Readonly<{ kind: 'Invoke'; producer: SourceExpression }>
  | Readonly<{
      kind: 'Complete'
      receiver: SourceExpression
      producer: SourceExpression
    }>
  | Readonly<{
      kind: 'Boundary'
      value: SourceExpression
      helper: ReadonlyArray<string>
      model: SourceExpression | undefined
    }>
  | Readonly<{ kind: 'Path'; names: ReadonlyArray<string> }>
  | Readonly<{
      kind: 'Call'
      receiver: SourceExpression
      method: string
    }>

type Module = Readonly<{
  imports: ReadonlyMap<
    string,
    Readonly<{
      source: string
      names: ReadonlyArray<string>
      typeOnly?: boolean
    }>
  >
  values: ReadonlyMap<string, SourceExpression>
  exports: ReadonlyMap<
    string,
    Readonly<{ source?: string; names: ReadonlyArray<string> }>
  >
}>

type BoundaryAnnotation = Readonly<{
  helper: unknown
  model: unknown
  producer: unknown
}>

type ImplementationFields = ReadonlyMap<string, ReadonlyArray<string>>

const nextStage = (
  stage: Stage | undefined,
  method: string,
): Stage | undefined => {
  if (
    (stage === 'Completed' || stage === 'CheckedCompleted') &&
    (method === 'provideHandlers' || method === 'replaceEffectsLayer')
  ) {
    return 'Completed'
  }
  if (stage === 'Block' && method === 'makeNamespace') {
    return 'Namespace'
  }
  if (
    (stage === 'Block' || stage === 'Namespace') &&
    method === 'makeDefinition'
  ) {
    return 'Definition'
  }
  if (stage === 'Definition' && method === 'makeComposition') {
    return 'Composition'
  }
  if (stage === 'Composition' && method === 'prepareBlock') {
    return 'Assembly'
  }
  return undefined
}

const invokedStage = (stage: Stage | undefined): Stage | undefined => {
  if (stage === 'Producer') {
    return 'Assembly'
  }

  if (stage === 'CompositionFactory') {
    return 'Composition'
  }

  return undefined
}

const widenedStage = (stage: Stage | undefined): Stage | undefined => {
  if (stage === 'CheckedCompleted') {
    return 'Completed'
  }

  if (stage === 'CompositionFactory') {
    return undefined
  }

  return stage
}

const boundaryHelpers = new Set([
  'FromAssemblyWithView',
  'FromAssemblyWithViewAndOutMessage',
  'FromAssemblyWithOutMessage',
  'FromAssemblyWithoutViewOrOutMessage',
])

const isBoundaryHelper = (
  source: string,
  members: ReadonlyArray<string>,
): boolean => {
  const name = Option.getOrUndefined(Array.last(members))
  return (
    name !== undefined &&
    boundaryHelpers.has(name) &&
    ((source === 'foldkit' &&
      members.length === 2 &&
      Option.contains(Array.head(members), 'Block')) ||
      (source === 'foldkit/block' && members.length === 1))
  )
}

const isBlockType = (
  source: string,
  members: ReadonlyArray<string>,
  name: string,
): boolean =>
  (source === 'foldkit' && members.join('.') === `Block.${name}`) ||
  (source === 'foldkit/block' &&
    members.length === 1 &&
    Option.contains(Array.head(members), name))

const isSyntaxNode = (node: unknown): node is ESTree.Node =>
  typeof node === 'object' && node !== null && 'type' in node

const typeChangingExpression = (node: unknown): unknown => {
  if (
    isSyntaxNode(node) &&
    (node.type === 'TSAsExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TSInstantiationExpression')
  ) {
    return node.expression
  }
  return undefined
}

const hasAnnotation = (node: unknown): boolean =>
  isSyntaxNode(node) &&
  node.type === 'Identifier' &&
  node.typeAnnotation !== undefined &&
  node.typeAnnotation !== null

const producerBody = (node: unknown): unknown => {
  if (
    !isArrowFunction(node) ||
    node.async ||
    node.params.length !== 0 ||
    (node.typeParameters !== undefined && node.typeParameters !== null)
  ) {
    return undefined
  }
  const body = node.body
  if (body.type === 'BlockStatement') {
    const statement = Option.getOrUndefined(Array.head(body.body))
    return body.body.length === 1 && statement?.type === 'ReturnStatement'
      ? statement.argument
      : undefined
  }
  return body
}

const isPlainProducer = (node: unknown): boolean => {
  if (
    !isArrowFunction(node) ||
    (node.returnType !== undefined && node.returnType !== null)
  ) {
    return false
  }
  const body = producerBody(node)
  return (
    isCallExpression(body) &&
    isMemberExpression(body.callee) &&
    unwrapSchemaExpression(body.callee.object) === body.callee.object &&
    Option.contains(staticMemberName(body.callee), 'prepareBlock')
  )
}

const exactPath = (node: unknown): ReadonlyArray<string> | undefined => {
  if (unwrapSchemaExpression(node) !== node) {
    return undefined
  }
  const path = Option.getOrUndefined(staticMemberPath(node))
  return path === undefined ? undefined : [path.root.name, ...path.members]
}

const samePath = (
  left: ReadonlyArray<string> | undefined,
  right: ReadonlyArray<string> | undefined,
): boolean =>
  left !== undefined &&
  right !== undefined &&
  left.length === right.length &&
  left.every((name, index) => Option.contains(Array.get(right, index), name))

const implementationFields = (
  node: unknown,
): ImplementationFields | undefined => {
  if (
    !isSyntaxNode(node) ||
    node.type !== 'TSInterfaceDeclaration' ||
    node.extends.length !== 0 ||
    (node.typeParameters !== undefined && node.typeParameters !== null)
  ) {
    return undefined
  }
  const fields = new Map<string, ReadonlyArray<string>>()
  for (const member of node.body.body) {
    if (
      member.type !== 'TSPropertySignature' ||
      !member.readonly ||
      member.optional ||
      member.computed ||
      !isIdentifierReference(member.key)
    ) {
      return undefined
    }
    const annotation = member.typeAnnotation?.typeAnnotation
    if (
      annotation?.type !== 'TSTypeQuery' ||
      (annotation.typeArguments !== undefined &&
        annotation.typeArguments !== null)
    ) {
      return undefined
    }
    const path = exactPath(annotation.exprName)
    if (path === undefined || fields.has(member.key.name)) {
      return undefined
    }
    fields.set(member.key.name, path)
  }
  return fields
}

const isNamedProducer = (
  node: unknown,
  interfaces: ReadonlyMap<string, ImplementationFields | undefined>,
  isHelper: (node: unknown, name: string) => boolean,
): boolean => {
  if (!isArrowFunction(node)) {
    return false
  }
  const body = producerBody(node)
  const draft = node.returnType?.typeAnnotation
  const completed =
    draft?.type === 'TSTypeReference'
      ? Option.getOrUndefined(Array.head(draft.typeArguments?.params ?? []))
      : undefined
  if (
    !isCallExpression(body) ||
    !isMemberExpression(body.callee) ||
    !Option.contains(staticMemberName(body.callee), 'prepareBlock') ||
    body.arguments.length !== 1 ||
    (body.typeArguments !== undefined && body.typeArguments !== null) ||
    draft?.type !== 'TSTypeReference' ||
    draft.typeArguments?.params.length !== 1 ||
    !isHelper(draft.typeName, 'AssemblyDraft') ||
    completed?.type !== 'TSTypeReference' ||
    completed.typeArguments?.params.length !== 2 ||
    !(
      isHelper(completed.typeName, 'CompletedWithView') ||
      isHelper(completed.typeName, 'CompletedWithViewAndOutMessage')
    )
  ) {
    return false
  }
  const [composition, implementation] = completed.typeArguments.params
  const argument = Option.getOrUndefined(Array.head(body.arguments))
  if (
    composition?.type !== 'TSTypeQuery' ||
    (composition.typeArguments !== undefined &&
      composition.typeArguments !== null) ||
    implementation?.type !== 'TSTypeReference' ||
    !isIdentifierReference(implementation.typeName) ||
    (implementation.typeArguments !== undefined &&
      implementation.typeArguments !== null) ||
    argument?.type !== 'TSSatisfiesExpression' ||
    argument.typeAnnotation.type !== 'TSTypeReference' ||
    !isIdentifierReference(argument.typeAnnotation.typeName) ||
    argument.typeAnnotation.typeName.name !== implementation.typeName.name ||
    (argument.typeAnnotation.typeArguments !== undefined &&
      argument.typeAnnotation.typeArguments !== null) ||
    !isObjectExpression(argument.expression)
  ) {
    return false
  }
  const owner = exactPath(composition.exprName)
  const receiver = exactPath(body.callee.object)
  const fields = interfaces.get(implementation.typeName.name)
  if (
    !samePath(owner, receiver) ||
    fields === undefined ||
    fields.size !== argument.expression.properties.length
  ) {
    return false
  }
  const seen = new Set<string>()
  return argument.expression.properties.every(property => {
    if (
      !isObjectProperty(property) ||
      property.computed ||
      property.method ||
      property.kind !== 'init' ||
      !isIdentifierReference(property.key) ||
      seen.has(property.key.name)
    ) {
      return false
    }
    seen.add(property.key.name)
    const value = exactPath(property.value)
    return samePath(fields.get(property.key.name), value)
  })
}

const boundaryAnnotation = (
  identifier: unknown,
  init: unknown,
  interfaceBoundaries: ReadonlyMap<
    string,
    BoundaryAnnotation | undefined
  > = new Map(),
): BoundaryAnnotation | undefined => {
  if (
    !isSyntaxNode(identifier) ||
    identifier.type !== 'Identifier' ||
    !isCallExpression(init) ||
    !isMemberExpression(init.callee) ||
    !Option.contains(staticMemberName(init.callee), 'assemble') ||
    init.arguments.length !== 1 ||
    (init.typeArguments !== undefined && init.typeArguments !== null)
  ) {
    return undefined
  }
  const completionProducer = Option.getOrUndefined(Array.head(init.arguments))
  if (!isIdentifierReference(completionProducer)) {
    return undefined
  }
  const annotation = identifier.typeAnnotation?.typeAnnotation
  if (annotation?.type !== 'TSTypeReference') {
    return undefined
  }
  const directArguments = annotation.typeArguments?.params
  const namedInterface =
    (annotation.typeArguments === undefined ||
      annotation.typeArguments === null) &&
    isIdentifierReference(annotation.typeName) &&
    annotation.typeName.name === identifier.name
      ? interfaceBoundaries.get(identifier.name)
      : undefined
  const [model, producer] =
    directArguments?.length === 2
      ? directArguments
      : [namedInterface?.model, namedInterface?.producer]
  const helper =
    directArguments?.length === 2 ? annotation.typeName : namedInterface?.helper
  return isSyntaxNode(model) &&
    model.type === 'TSTypeQuery' &&
    isSyntaxNode(producer) &&
    producer.type === 'TSTypeQuery' &&
    (model.typeArguments === undefined || model.typeArguments === null) &&
    (producer.typeArguments === undefined || producer.typeArguments === null) &&
    isIdentifierReference(producer.exprName) &&
    producer.exprName.name === completionProducer.name
    ? {
        helper,
        model: model.exprName,
        producer: completionProducer,
      }
    : undefined
}

const sourceExpression = (
  input: unknown,
  checkedProducer: (node: unknown) => boolean = isPlainProducer,
): SourceExpression | undefined => {
  const changed = typeChangingExpression(input)
  if (changed !== undefined) {
    const value = sourceExpression(changed, checkedProducer)
    return value === undefined ? undefined : { kind: 'Widened', value }
  }
  if (
    isSyntaxNode(input) &&
    'expression' in input &&
    new Set([
      'ParenthesizedExpression',
      'TSSatisfiesExpression',
      'TSNonNullExpression',
      'ChainExpression',
    ]).has(input.type)
  ) {
    return sourceExpression(input.expression, checkedProducer)
  }
  const node = unwrapSchemaExpression(input)
  const rawBody = producerBody(node)
  const body = unwrapSchemaExpression(rawBody)
  if (
    isCallExpression(body) &&
    isMemberExpression(body.callee) &&
    Option.contains(staticMemberName(body.callee), 'prepareBlock')
  ) {
    const expression = sourceExpression(body, checkedProducer)
    return expression === undefined
      ? undefined
      : {
          kind: 'Producer',
          body: expression,
          checked: input === node && rawBody === body && checkedProducer(node),
        }
  }
  if (isCallExpression(node) && isIdentifierReference(node.callee)) {
    const producer = sourceExpression(node.callee, checkedProducer)
    return producer === undefined ? undefined : { kind: 'Invoke', producer }
  }
  if (isCallExpression(node) && isMemberExpression(node.callee)) {
    const receiver = sourceExpression(node.callee.object, checkedProducer)
    const method = Option.getOrUndefined(staticMemberName(node.callee))
    const producer = Option.getOrUndefined(Array.head(node.arguments))
    if (
      method === 'assemble' &&
      node.arguments.length === 1 &&
      receiver !== undefined
    ) {
      const producerExpression = sourceExpression(producer, checkedProducer)
      return producerExpression === undefined
        ? undefined
        : { kind: 'Complete', receiver, producer: producerExpression }
    }
    return receiver === undefined || method === undefined
      ? undefined
      : { kind: 'Call', receiver, method }
  }
  if (
    isMemberExpression(node) &&
    Option.contains(staticMemberName(node), 'Model')
  ) {
    const receiver = sourceExpression(node.object, checkedProducer)
    return receiver === undefined
      ? undefined
      : { kind: 'ModelProjection', receiver }
  }
  const path = staticMemberPath(node)
  return Option.isNone(path)
    ? undefined
    : { kind: 'Path', names: [path.value.root.name, ...path.value.members] }
}

const emptyModule = (): Module => ({
  imports: new Map(),
  values: new Map(),
  exports: new Map(),
})

const moduleName = (name: ModuleExportName): string =>
  name.type === 'Identifier' ? name.name : name.value

const readModule = (filename: string): Module => {
  try {
    const parsed = parseSync(filename, readFileSync(filename, 'utf8'), {
      showSemanticErrors: true,
    })
    if (Array.isArrayNonEmpty(parsed.errors)) {
      return emptyModule()
    }

    const imports = new Map<
      string,
      Readonly<{
        source: string
        names: ReadonlyArray<string>
        typeOnly?: boolean
      }>
    >()
    const values = new Map<string, SourceExpression>()
    const exports = new Map<
      string,
      Readonly<{ source?: string; names: ReadonlyArray<string> }>
    >()
    const interfaceBoundaries = new Map<
      string,
      BoundaryAnnotation | undefined
    >()
    const interfaces = new Map<string, ImplementationFields | undefined>()
    for (const statement of parsed.program.body) {
      if (statement.type === 'ImportDeclaration') {
        for (const specifier of statement.specifiers) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            imports.set(specifier.local.name, {
              source: statement.source.value,
              names: [],
              typeOnly: statement.importKind === 'type',
            })
          } else if (specifier.type === 'ImportSpecifier') {
            imports.set(specifier.local.name, {
              source: statement.source.value,
              names: [moduleName(specifier.imported)],
              typeOnly:
                statement.importKind === 'type' ||
                specifier.importKind === 'type',
            })
          }
        }
      }
      const declaration =
        statement.type === 'ExportNamedDeclaration'
          ? statement.declaration
          : statement
      if (declaration?.type !== 'TSInterfaceDeclaration') {
        continue
      }
      const name = declaration.id.name
      interfaces.set(
        name,
        interfaces.has(name) ? undefined : implementationFields(declaration),
      )
      if (statement.type !== 'ExportNamedDeclaration') {
        continue
      }
      if (interfaceBoundaries.has(name)) {
        interfaceBoundaries.set(name, undefined)
        continue
      }
      const heritage = Option.getOrUndefined(Array.head(declaration.extends))
      const arguments_ = heritage?.typeArguments?.params
      const [model, producer] = arguments_ ?? []
      interfaceBoundaries.set(
        name,
        declaration.extends.length === 1 &&
          declaration.body.body.length === 0 &&
          (declaration.typeParameters === undefined ||
            declaration.typeParameters === null) &&
          arguments_?.length === 2 &&
          model?.type === 'TSTypeQuery' &&
          producer?.type === 'TSTypeQuery'
          ? {
              helper: heritage?.expression,
              model,
              producer,
            }
          : undefined,
      )
    }
    for (const statement of parsed.program.body) {
      if (
        statement.type === 'ExportAllDeclaration' &&
        statement.exported !== null &&
        statement.exportKind !== 'type'
      ) {
        exports.set(moduleName(statement.exported), {
          source: statement.source.value,
          names: [],
        })
      }
      if (
        statement.type === 'ExportNamedDeclaration' &&
        statement.exportKind !== 'type'
      ) {
        for (const specifier of statement.specifiers) {
          if (specifier.exportKind !== 'type') {
            exports.set(moduleName(specifier.exported), {
              ...(statement.source === null
                ? {}
                : { source: statement.source.value }),
              names: [moduleName(specifier.local)],
            })
          }
        }
      }

      const declaration =
        statement.type === 'ExportNamedDeclaration'
          ? statement.declaration
          : statement
      if (
        declaration?.type !== 'VariableDeclaration' ||
        declaration.kind !== 'const' ||
        declaration.declare
      ) {
        continue
      }
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === 'ObjectPattern') {
          const owner = sourceExpression(declarator.init)

          if (
            owner?.kind !== 'Path' ||
            (declarator.id.typeAnnotation !== undefined &&
              declarator.id.typeAnnotation !== null)
          ) {
            continue
          }

          for (const property of declarator.id.properties) {
            if (
              !isObjectProperty(property) ||
              !isIdentifierReference(property.value)
            ) {
              continue
            }

            const member = Option.getOrUndefined(staticPropertyName(property))

            if (member === undefined) {
              continue
            }

            values.set(property.value.name, {
              kind: 'Path',
              names: [...owner.names, member],
            })

            if (statement.type === 'ExportNamedDeclaration') {
              exports.set(property.value.name, {
                names: [property.value.name],
              })
            }
          }

          continue
        }

        if (declarator.id.type !== 'Identifier') {
          continue
        }
        const value = sourceExpression(
          declarator.init,
          node =>
            isPlainProducer(node) ||
            isNamedProducer(node, interfaces, (helper, name) => {
              const path = Option.getOrUndefined(staticMemberPath(helper))
              const imported =
                path === undefined ? undefined : imports.get(path.root.name)
              return (
                path !== undefined &&
                imported !== undefined &&
                isBlockType(
                  imported.source,
                  [...imported.names, ...path.members],
                  name,
                )
              )
            }),
        )
        const annotation = boundaryAnnotation(
          declarator.id,
          declarator.init,
          interfaceBoundaries,
        )
        const helper = Option.getOrUndefined(
          staticMemberPath(annotation?.helper),
        )
        const expression: SourceExpression | undefined =
          value !== undefined && helper !== undefined
            ? {
                kind: 'Boundary',
                value,
                helper: [helper.root.name, ...helper.members],
                model: sourceExpression(annotation?.model),
              }
            : value !== undefined && hasAnnotation(declarator.id)
              ? { kind: 'Widened', value }
              : value
        if (expression !== undefined) {
          values.set(declarator.id.name, expression)
          if (statement.type === 'ExportNamedDeclaration') {
            exports.set(declarator.id.name, { names: [declarator.id.name] })
          }
        }
      }
    }
    return { imports, values, exports }
  } catch {
    return emptyModule()
  }
}

const expressionWrappers = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'ChainExpression',
])

/** Returns the value expression beneath transparent TypeScript expression wrappers. */
export const unwrapSchemaExpression = (node: unknown): unknown => {
  if (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    Predicate.isString(node.type) &&
    expressionWrappers.has(node.type) &&
    'expression' in node
  ) {
    return unwrapSchemaExpression(node.expression)
  }
  return node
}

const makeBlockStageResolver = (
  references: WeakMap<ESTree.Node, Reference>,
  filename: string | undefined,
): ((node: unknown) => Stage | undefined) => {
  const modules = new Map<string, Module>()
  const moduleAt = (path: string): Module => {
    const existing = modules.get(path)
    if (existing !== undefined) {
      return existing
    }
    const loaded = readModule(path)
    modules.set(path, loaded)
    return loaded
  }

  const importedStage = (
    importer: string | undefined,
    source: string,
    names: ReadonlyArray<string>,
    visited: ReadonlySet<string>,
  ): Stage | undefined => {
    if (
      (source === 'foldkit' && names.join('.') === 'Block') ||
      (source === 'foldkit/block' && Array.isReadonlyArrayEmpty(names))
    ) {
      return 'Block'
    }
    if (importer === undefined) {
      return undefined
    }
    const file = sourceFileForModule(importer, source)
    if (
      Option.isNone(file) ||
      !/\.tsx?$/u.test(file.value) ||
      /\.d\.tsx?$/u.test(file.value)
    ) {
      return undefined
    }
    const key = `${file.value}:${names.join('.')}`
    if (visited.has(key)) {
      return undefined
    }
    const [name, ...members] = names
    if (name === undefined) {
      return undefined
    }
    const exported = moduleAt(file.value).exports.get(name)
    if (exported === undefined) {
      return undefined
    }
    const nextVisited = new Set([...visited, key])
    return exported.source === undefined
      ? sourceStage(
          file.value,
          { kind: 'Path', names: [...exported.names, ...members] },
          nextVisited,
        )
      : importedStage(
          file.value,
          exported.source,
          [...exported.names, ...members],
          nextVisited,
        )
  }

  const sourceStage = (
    file: string,
    expression: SourceExpression,
    visited: ReadonlySet<string>,
  ): Stage | undefined => {
    if (expression.kind === 'ModelProjection') {
      return undefined
    }
    if (expression.kind === 'Widened') {
      return widenedStage(sourceStage(file, expression.value, visited))
    }
    if (expression.kind === 'Producer') {
      return sourceStage(file, expression.body, visited) === 'Assembly'
        ? 'Producer'
        : undefined
    }
    if (expression.kind === 'Invoke') {
      return invokedStage(sourceStage(file, expression.producer, visited))
    }
    if (expression.kind === 'Complete') {
      return sourceStage(file, expression.receiver, visited) === 'Block'
        ? 'Completed'
        : undefined
    }
    if (expression.kind === 'Boundary') {
      const stage = sourceStage(file, expression.value, visited)
      const [name, ...members] = expression.helper
      const imported =
        name === undefined ? undefined : moduleAt(file).imports.get(name)
      const completion =
        expression.value.kind === 'Complete' ? expression.value : undefined
      const completionProducer = completion?.producer
      const producer =
        completionProducer?.kind === 'Path' &&
        completionProducer.names.length === 1
          ? moduleAt(file).values.get(
              Option.getOrUndefined(Array.head(completionProducer.names)) ?? '',
            )
          : undefined
      return stage === 'Completed' &&
        completionProducer !== undefined &&
        producer?.kind === 'Producer' &&
        producer.checked &&
        sourceStage(file, completionProducer, visited) === 'Producer' &&
        !sourceModelDependency(file, expression.model, visited) &&
        imported !== undefined &&
        isBoundaryHelper(imported.source, [...imported.names, ...members])
        ? 'CheckedCompleted'
        : stage
    }
    if (expression.kind === 'Call') {
      return nextStage(
        sourceStage(file, expression.receiver, visited),
        expression.method,
      )
    }
    const [name, ...members] = expression.names
    if (name === undefined) {
      return undefined
    }
    const key = `${file}:local:${name}`
    if (visited.has(key)) {
      return undefined
    }
    const module = moduleAt(file)
    const imported = module.imports.get(name)
    if (imported !== undefined) {
      if (imported.typeOnly) {
        return undefined
      }
      return importedStage(
        file,
        imported.source,
        [...imported.names, ...members],
        visited,
      )
    }
    const value = module.values.get(name)
    if (value === undefined) {
      return undefined
    }
    if (Array.isArrayNonEmpty(members)) {
      if (
        members.length === 1 &&
        Option.contains(Array.head(members), 'makeComposition')
      ) {
        return sourceStage(file, value, new Set([...visited, key])) ===
          'Definition'
          ? 'CompositionFactory'
          : undefined
      }

      return value.kind === 'Path'
        ? sourceStage(
            file,
            { kind: 'Path', names: [...value.names, ...members] },
            new Set([...visited, key]),
          )
        : undefined
    }
    return sourceStage(file, value, new Set([...visited, key]))
  }

  const importedModelDependency = (
    importer: string | undefined,
    source: string,
    names: ReadonlyArray<string>,
    visited: ReadonlySet<string>,
  ): boolean => {
    if (importer === undefined) {
      return false
    }
    const file = sourceFileForModule(importer, source)
    if (
      Option.isNone(file) ||
      !/\.tsx?$/u.test(file.value) ||
      /\.d\.tsx?$/u.test(file.value)
    ) {
      return false
    }
    const [name, ...members] = names
    if (name === undefined) {
      return false
    }
    const key = `schema:${file.value}:${names.join('.')}`
    if (visited.has(key)) {
      return false
    }
    const exported = moduleAt(file.value).exports.get(name)
    if (exported === undefined) {
      return false
    }
    const nextVisited = new Set([...visited, key])
    return exported.source === undefined
      ? sourceModelDependency(
          file.value,
          { kind: 'Path', names: [...exported.names, ...members] },
          nextVisited,
        )
      : importedModelDependency(
          file.value,
          exported.source,
          [...exported.names, ...members],
          nextVisited,
        )
  }

  const sourceModelDependency = (
    file: string,
    expression: SourceExpression | undefined,
    visited: ReadonlySet<string>,
  ): boolean => {
    if (expression?.kind === 'ModelProjection') {
      return sourceStage(file, expression.receiver, visited) === 'Completed'
    }
    if (expression?.kind === 'Widened') {
      return sourceModelDependency(file, expression.value, visited)
    }
    if (expression?.kind !== 'Path') {
      return false
    }
    const last = Option.getOrUndefined(Array.last(expression.names))
    if (
      last === 'Model' &&
      sourceStage(
        file,
        { kind: 'Path', names: expression.names.slice(0, -1) },
        visited,
      ) === 'Completed'
    ) {
      return true
    }
    const [name, ...members] = expression.names
    if (name === undefined) {
      return false
    }
    const key = `schema-local:${file}:${name}`
    if (visited.has(key)) {
      return false
    }
    const nextVisited = new Set([...visited, key])
    const module = moduleAt(file)
    const imported = module.imports.get(name)
    if (imported !== undefined) {
      return importedModelDependency(
        file,
        imported.source,
        [...imported.names, ...members],
        nextVisited,
      )
    }
    const value = module.values.get(name)
    if (value?.kind === 'Path') {
      return sourceModelDependency(
        file,
        { kind: 'Path', names: [...value.names, ...members] },
        nextVisited,
      )
    }
    return members.length === 0
      ? sourceModelDependency(file, value, nextVisited)
      : false
  }

  const localModelDependency = (
    input: unknown,
    visited: ReadonlySet<Variable> = new Set(),
  ): boolean => {
    const node = unwrapSchemaExpression(input)
    if (
      isMemberExpression(node) &&
      Option.contains(staticMemberName(node), 'Model') &&
      localStage(node.object) === 'Completed'
    ) {
      return true
    }
    const path = staticMemberPath(node)
    if (
      Option.isSome(path) &&
      Option.contains(Array.last(path.value.members), 'Model') &&
      localStage(
        path.value.root,
        new Set(),
        path.value.members.slice(0, -1),
      ) === 'Completed'
    ) {
      return true
    }
    const imported = resolveImportedPath(references, node)
    if (Option.isSome(imported)) {
      return importedModelDependency(
        filename,
        imported.value.source,
        imported.value.members,
        new Set(),
      )
    }
    if (!isIdentifierReference(node)) {
      return false
    }
    const variable = resolvedVariable(references, node)
    if (Option.isNone(variable) || visited.has(variable.value)) {
      return false
    }
    return variable.value.defs.some(
      definition =>
        definition.type === 'Variable' &&
        definition.parent?.type === 'VariableDeclaration' &&
        definition.parent.kind === 'const' &&
        isVariableDeclarator(definition.node) &&
        localModelDependency(
          definition.node.init,
          new Set([...visited, variable.value]),
        ),
    )
  }

  const localStage = (
    input: unknown,
    visited: ReadonlySet<Variable> = new Set(),
    members: ReadonlyArray<string> = [],
  ): Stage | undefined => {
    const changed = typeChangingExpression(input)
    if (changed !== undefined) {
      return widenedStage(localStage(changed, visited, members))
    }
    if (
      isSyntaxNode(input) &&
      'expression' in input &&
      new Set([
        'ParenthesizedExpression',
        'TSSatisfiesExpression',
        'TSNonNullExpression',
        'ChainExpression',
      ]).has(input.type)
    ) {
      return localStage(input.expression, visited, members)
    }
    const node = unwrapSchemaExpression(input)
    if (
      members.length === 1 &&
      Option.contains(Array.head(members), 'makeComposition')
    ) {
      return localStage(node, visited) === 'Definition'
        ? 'CompositionFactory'
        : undefined
    }

    if (Array.isReadonlyArrayEmpty(members)) {
      const body = unwrapSchemaExpression(producerBody(node))
      if (
        isCallExpression(body) &&
        isMemberExpression(body.callee) &&
        Option.contains(staticMemberName(body.callee), 'prepareBlock')
      ) {
        return localStage(body, visited) === 'Assembly' ? 'Producer' : undefined
      }
      if (isCallExpression(node) && isIdentifierReference(node.callee)) {
        return invokedStage(localStage(node.callee, visited))
      }
    }
    if (
      Array.isReadonlyArrayEmpty(members) &&
      isCallExpression(node) &&
      isMemberExpression(node.callee)
    ) {
      const method = Option.getOrUndefined(staticMemberName(node.callee))
      if (method === 'assemble' && node.arguments.length === 1) {
        return localStage(node.callee.object, visited) === 'Block'
          ? 'Completed'
          : undefined
      }
      return method === undefined
        ? undefined
        : nextStage(localStage(node.callee.object, visited), method)
    }
    const imported = resolveImportedPath(references, node)
    if (Option.isSome(imported)) {
      return importedStage(
        filename,
        imported.value.source,
        [...imported.value.members, ...members],
        new Set(),
      )
    }
    if (isMemberExpression(node)) {
      const member = Option.getOrUndefined(staticMemberName(node))
      return member === undefined
        ? undefined
        : localStage(node.object, visited, [member, ...members])
    }
    if (!isIdentifierReference(node)) {
      return undefined
    }
    const variable = resolvedVariable(references, node)
    if (Option.isNone(variable) || visited.has(variable.value)) {
      return undefined
    }
    for (const definition of variable.value.defs) {
      if (
        definition.type === 'Variable' &&
        definition.parent?.type === 'VariableDeclaration' &&
        definition.parent.kind === 'const' &&
        isVariableDeclarator(definition.node)
      ) {
        if (definition.node.id.type === 'ObjectPattern') {
          if (
            (definition.node.id.typeAnnotation !== undefined &&
              definition.node.id.typeAnnotation !== null) ||
            typeChangingExpression(definition.node.init) !== undefined
          ) {
            return undefined
          }

          const property = Array.findFirst(
            definition.node.id.properties,
            property =>
              isObjectProperty(property) &&
              isIdentifierReference(property.value) &&
              property.value.name === node.name,
          )

          const member = Option.flatMap(property, property =>
            isObjectProperty(property)
              ? staticPropertyName(property)
              : Option.none(),
          )

          return Option.isSome(member)
            ? localStage(
                definition.node.init,
                new Set([...visited, variable.value]),
                [member.value, ...members],
              )
            : undefined
        }

        const stage = localStage(
          definition.node.init,
          new Set([...visited, variable.value]),
          members,
        )
        const helper = boundaryAnnotation(
          definition.node.id,
          definition.node.init,
        )
        const namedBoundary =
          filename === undefined || !isIdentifierReference(definition.node.id)
            ? undefined
            : moduleAt(filename).values.get(definition.node.id.name)
        if (
          filename !== undefined &&
          (variable.value.scope.type === 'module' ||
            variable.value.scope.type === 'global') &&
          namedBoundary?.kind === 'Boundary' &&
          Array.isReadonlyArrayEmpty(members) &&
          sourceStage(filename, namedBoundary, new Set()) === 'CheckedCompleted'
        ) {
          return 'CheckedCompleted'
        }
        const importedHelper = resolveImportedPath(references, helper?.helper)
        const producerVariable = isIdentifierReference(helper?.producer)
          ? resolvedVariable(references, helper.producer)
          : Option.none<Variable>()
        const plainProducer = Option.exists(producerVariable, producer =>
          producer.defs.some(definition => {
            if (
              definition.type !== 'Variable' ||
              definition.parent?.type !== 'VariableDeclaration' ||
              definition.parent.kind !== 'const' ||
              !isVariableDeclarator(definition.node)
            ) {
              return false
            }
            return isPlainProducer(definition.node.init)
          }),
        )
        const actualProducer = localStage(helper?.producer) === 'Producer'
        const preservedStage = hasAnnotation(definition.node.id)
          ? widenedStage(stage)
          : stage
        return stage === 'Completed' &&
          plainProducer &&
          actualProducer &&
          !localModelDependency(helper?.model) &&
          Array.isReadonlyArrayEmpty(members) &&
          Option.exists(importedHelper, path =>
            isBoundaryHelper(path.source, path.members),
          )
          ? 'CheckedCompleted'
          : preservedStage
      }
    }
    return undefined
  }

  return node => localStage(node)
}

/** Tracks only proven Foldkit authoring chains and their immutable aliases. */
export const makeCompletedBlockProvenance = (
  references: WeakMap<ESTree.Node, Reference>,
  filename: string | undefined,
): ((node: unknown) => boolean) => {
  const stageOf = makeBlockStageResolver(references, filename)
  return node => stageOf(node) === 'Completed'
}

/** Recognizes Definition owners through proven Foldkit factories and imports. */
export const makeBlockDefinitionProvenance = (
  references: WeakMap<ESTree.Node, Reference>,
  filename: string | undefined,
): ((node: unknown) => boolean) => {
  const stageOf = makeBlockStageResolver(references, filename)
  return node => stageOf(node) === 'Definition'
}
