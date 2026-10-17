import { Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type OxlintScope,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import {
  indexReferences,
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
  staticStringValue,
  blockBindingMethod,
  blockBindingConfiguration,
  isOwnedDefinitionCall,
} from '../guards.ts'

const directBlockStateUpdateMessage = (fieldName: string): string =>
  `Do not update the Block field \`${fieldName}\` directly from its parent. Expose a child-owned update capability, then call it through the registered Binding.`

const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isArrowFunction = (
  value: unknown,
): value is ESTree.ArrowFunctionExpression =>
  isNode(value) && value.type === 'ArrowFunctionExpression'

const isReturnStatement = (value: unknown): value is ESTree.ReturnStatement =>
  isNode(value) && value.type === 'ReturnStatement'

const walk = (
  root: ESTree.Node,
  visit: (node: ESTree.Node, ancestors: ReadonlyArray<ESTree.Node>) => void,
): void => {
  const visited = new WeakSet<object>()
  const visitNode = (
    node: ESTree.Node,
    ancestors: ReadonlyArray<ESTree.Node>,
  ): void => {
    if (visited.has(node)) {
      return
    }
    visited.add(node)
    visit(node, ancestors)

    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') {
        continue
      }
      if (isNode(value)) {
        visitNode(value, [...ancestors, node])
      } else if (globalThis.Array.isArray(value)) {
        for (const entry of value) {
          if (isNode(entry)) {
            visitNode(entry, [...ancestors, node])
          }
        }
      }
    }
  }

  visitNode(root, [])
}

const expressionReturnedBy = (
  callback: ESTree.ArrowFunctionExpression,
): ESTree.Expression | undefined => {
  if (callback.body.type !== 'BlockStatement') {
    return callback.body
  }
  for (const statement of callback.body.body) {
    if (isReturnStatement(statement) && statement.argument !== null) {
      return statement.argument
    }
  }
  return undefined
}

const isFunction = (
  node: ESTree.Node,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  node.type === 'ArrowFunctionExpression' ||
  node.type === 'FunctionExpression' ||
  node.type === 'FunctionDeclaration'

const expressionsReturnedBy = (
  callback: ESTree.ArrowFunctionExpression,
): ReadonlyArray<ESTree.Expression> => {
  if (callback.body.type !== 'BlockStatement') {
    return [callback.body]
  }

  const returned: Array<ESTree.Expression> = []
  const visit = (node: ESTree.Node): void => {
    if (isFunction(node)) {
      return
    }
    if (isReturnStatement(node) && node.argument !== null) {
      returned.push(node.argument)
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') {
        continue
      }
      if (isNode(value)) {
        visit(value)
      } else if (globalThis.Array.isArray(value)) {
        for (const entry of value) {
          if (isNode(entry)) {
            visit(entry)
          }
        }
      }
    }
  }

  for (const statement of callback.body.body) {
    visit(statement)
  }
  return returned
}

const directMemberField = (
  expression: unknown,
  parameterName: string,
): string | undefined => {
  if (!isMemberExpression(expression) || expression.computed) {
    return undefined
  }
  if (!isIdentifier(expression.object, parameterName)) {
    return undefined
  }
  return isIdentifier(expression.property)
    ? expression.property.name
    : undefined
}

const directReadField = (
  callback: ESTree.ArrowFunctionExpression,
): string | undefined => {
  const [modelParameter] = callback.params
  if (!isIdentifier(modelParameter)) {
    return undefined
  }
  const returned = expressionReturnedBy(callback)
  if (!isCallExpression(returned)) {
    return undefined
  }
  const [readValue] = returned.arguments
  return directMemberField(readValue, modelParameter.name)
}

const propertyValue = (
  object: ESTree.ObjectExpression,
  name: string,
): unknown => {
  for (const property of object.properties) {
    if (
      property.type === 'Property' &&
      !property.computed &&
      isIdentifier(property.key, name)
    ) {
      return property.value
    }
  }
  return undefined
}

const directWriteField = (
  callback: ESTree.ArrowFunctionExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  nextChildParameterIndex = 1,
): string | undefined => {
  const [modelParameter, secondParameter, thirdParameter] = callback.params
  const nextChildParameter =
    nextChildParameterIndex === 2 ? thirdParameter : secondParameter
  if (!isIdentifier(modelParameter) || !isIdentifier(nextChildParameter)) {
    return undefined
  }
  const returned = expressionReturnedBy(callback)
  if (
    !isCallExpression(returned) ||
    !isModifyFieldsCall(returned, references)
  ) {
    return undefined
  }
  const [updatedModel, updates] = returned.arguments
  if (
    !isIdentifier(updatedModel, modelParameter.name) ||
    !isObjectExpression(updates)
  ) {
    return undefined
  }

  for (const property of updates.properties) {
    if (
      property.type !== 'Property' ||
      property.computed ||
      !isIdentifier(property.key) ||
      !isArrowFunction(property.value)
    ) {
      continue
    }
    const replacement = expressionReturnedBy(property.value)
    if (isIdentifier(replacement, nextChildParameter.name)) {
      return property.key.name
    }
  }
  return undefined
}

const isModifyFieldsCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return (
      Option.exists(staticMemberPath(node.callee), path => {
        const [namespace, helperName, extraMember] = [
          path.root.name,
          ...path.members,
        ]
        return (
          namespace === 'Struct' &&
          helperName === 'modifyFields' &&
          extraMember === undefined
        )
      }) || isIdentifier(node.callee, 'modifyFields')
    )
  }
  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'Struct' &&
      helperName === 'modifyFields' &&
      extraMember === undefined
    )
  })
}

type FoldKind = 'Fold' | 'Keyed' | 'Step'

type DefinitionOwner = Readonly<{
  fallbackRootName: string
  members: ReadonlyArray<string>
  variable?: Variable
}>

const definitionOwner = (
  node: ESTree.CallExpression,
  methodName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DefinitionOwner | undefined => {
  const maybePath = staticMemberPath(node.callee)
  if (Option.isNone(maybePath)) {
    return undefined
  }

  const { root, members } = maybePath.value
  if (members.at(-1) !== methodName) {
    return undefined
  }

  return {
    fallbackRootName: root.name,
    members: members.slice(0, -1),
    ...(references === undefined
      ? {}
      : Option.match(resolvedVariable(references, root), {
          onNone: () => ({}),
          onSome: variable => ({ variable }),
        })),
  }
}

const isSameDefinitionOwner = (
  left: DefinitionOwner,
  right: DefinitionOwner,
): boolean => {
  if (
    left.members.length !== right.members.length ||
    left.members.some((member, index) => member !== right.members[index])
  ) {
    return false
  }

  if (left.variable !== undefined || right.variable !== undefined) {
    return left.variable !== undefined && left.variable === right.variable
  }

  return left.fallbackRootName === right.fallbackRootName
}

const foldKind = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): FoldKind | undefined => {
  const bindingMethod = blockBindingMethod(node, references)
  if (Option.isSome(bindingMethod)) {
    return bindingMethod.value === 'Keyed' ? 'Keyed' : 'Fold'
  }

  const foldKindForName = (helperName: string): FoldKind | undefined => {
    if (helperName === 'foldChild') {
      return 'Fold'
    }
    if (helperName === 'foldChildAt') {
      return 'Keyed'
    }
    if (helperName === 'foldChildStep') {
      return 'Step'
    }
    return undefined
  }

  if (references === undefined) {
    return Option.getOrUndefined(
      Option.flatMap(staticMemberPath(node.callee), path => {
        const [namespace, helperName, extraMember] = [
          path.root.name,
          ...path.members,
        ]
        if (namespace !== 'Update' || extraMember !== undefined) {
          return Option.none()
        }
        if (helperName === undefined) {
          return Option.none()
        }
        return Option.fromNullishOr(foldKindForName(helperName))
      }),
    )
  }
  return Option.getOrUndefined(
    Option.flatMap(resolveFoldkitApiPath(references, node.callee), path => {
      const [namespace, helperName, extraMember] = path
      if (namespace !== 'Update' || extraMember !== undefined) {
        return Option.none()
      }
      if (helperName === undefined) {
        return Option.none()
      }
      return Option.fromNullishOr(foldKindForName(helperName))
    }),
  )
}

const isCombineCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return Option.exists(staticMemberPath(node.callee), path => {
      const [namespace, helperName, extraMember] = [
        path.root.name,
        ...path.members,
      ]
      return (
        namespace === 'Update' &&
        helperName === 'combine' &&
        extraMember === undefined
      )
    })
  }
  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'Update' &&
      helperName === 'combine' &&
      extraMember === undefined
    )
  })
}

const moduleCallbacks = (
  program: ESTree.Program,
): ReadonlyMap<string, ESTree.ArrowFunctionExpression> => {
  const callbacks = new Map<string, ESTree.ArrowFunctionExpression>()
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }
    for (const declarator of declaration.declarations) {
      if (isIdentifier(declarator.id) && isArrowFunction(declarator.init)) {
        callbacks.set(declarator.id.name, declarator.init)
      }
    }
  }
  return callbacks
}

const callbackValue = (
  value: unknown,
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
): ESTree.ArrowFunctionExpression | undefined =>
  isArrowFunction(value)
    ? value
    : isIdentifier(value)
      ? callbacks.get(value.name)
      : undefined

type FoldDefinition = Readonly<{
  childField: string
  kind: FoldKind
  owner?: DefinitionOwner
  wrappedChildField?: string
}>

type CombineStepDefinition = Readonly<{
  childFields: ReadonlySet<string>
  keyedChildFields: ReadonlySet<string>
  wrappedChildFields: ReadonlyMap<string, ReadonlySet<string>>
}>

type FoldEvidence = Readonly<{
  childFieldsByParentModel: ReadonlyMap<Variable, ReadonlySet<string>>
  fallbackChildFieldsByParentModel: ReadonlyMap<string, ReadonlySet<string>>
  keyedChildFieldsByParentModel: ReadonlyMap<Variable, ReadonlySet<string>>
  fallbackKeyedChildFieldsByParentModel: ReadonlyMap<
    string,
    ReadonlySet<string>
  >
  wrappedChildFieldsByParentModel: ReadonlyMap<
    Variable,
    ReadonlyMap<string, ReadonlySet<string>>
  >
  fallbackWrappedChildFieldsByParentModel: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlySet<string>>
  >
  writeCallbacks: ReadonlySet<ESTree.Node>
}>

const addChildField = <Key>(
  fieldsByParentModel: Map<Key, Set<string>>,
  parentModel: Key,
  childField: string,
): void => {
  const fields = fieldsByParentModel.get(parentModel)
  if (fields === undefined) {
    fieldsByParentModel.set(parentModel, new Set([childField]))
    return
  }
  fields.add(childField)
}

const addWrappedChildField = <Key>(
  fieldsByParentModel: Map<Key, Map<string, Set<string>>>,
  parentModel: Key,
  parentField: string,
  childField: string,
): void => {
  const fieldsByParentField =
    fieldsByParentModel.get(parentModel) ?? new Map<string, Set<string>>()
  const fields = fieldsByParentField.get(parentField) ?? new Set<string>()
  fields.add(childField)
  fieldsByParentField.set(parentField, fields)
  fieldsByParentModel.set(parentModel, fieldsByParentField)
}

const foldDefinitions = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Readonly<{
  byVariable: WeakMap<Variable, FoldDefinition>
  fallbackByName: ReadonlyMap<string, FoldDefinition>
  writeCallbacks: ReadonlySet<ESTree.Node>
}> => {
  const callbacks = moduleCallbacks(program)
  const byVariable = new WeakMap<Variable, FoldDefinition>()
  const fallbackByName = new Map<string, FoldDefinition>()
  const writeCallbacks = new Set<ESTree.Node>()

  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }

    for (const declarator of declaration.declarations) {
      if (!isIdentifier(declarator.id) || !isCallExpression(declarator.init)) {
        continue
      }
      const kind = foldKind(declarator.init, references)
      if (kind === undefined) {
        continue
      }

      const configuration = blockBindingConfiguration(declarator.init)
      if (!isObjectExpression(configuration)) {
        continue
      }

      const bindingMethod = blockBindingMethod(declarator.init, references)
      const owner = Option.isSome(bindingMethod)
        ? definitionOwner(declarator.init, 'bindChild', references)
        : undefined
      const directField =
        Option.isSome(bindingMethod) &&
        propertyValue(configuration, 'field') !== undefined
          ? Option.getOrUndefined(
              staticStringValue(propertyValue(configuration, 'field')),
            )
          : undefined
      if (directField !== undefined) {
        const wrappedChildField = Option.getOrUndefined(
          staticStringValue(propertyValue(configuration, 'childField')),
        )
        const definition = {
          childField: directField,
          kind,
          ...(owner === undefined ? {} : { owner }),
          ...(wrappedChildField === undefined ? {} : { wrappedChildField }),
        }
        fallbackByName.set(declarator.id.name, definition)
        for (const scope of scopes ?? []) {
          for (const variable of scope.variables) {
            if (
              variable.defs.some(candidate => candidate.node === declarator)
            ) {
              byVariable.set(variable, definition)
            }
          }
        }
        continue
      }

      const keyedReadPropertyName = Option.isSome(bindingMethod)
        ? 'readAll'
        : 'readAt'
      const readPropertyName = kind === 'Keyed' ? keyedReadPropertyName : 'read'
      const writePropertyName = kind === 'Keyed' ? 'writeAt' : 'write'
      const read = callbackValue(
        propertyValue(configuration, readPropertyName),
        callbacks,
      )
      const write = callbackValue(
        propertyValue(configuration, writePropertyName),
        callbacks,
      )
      if (read === undefined || write === undefined) {
        continue
      }

      writeCallbacks.add(write)
      const readField = directReadField(read)
      const writeField = directWriteField(
        write,
        references,
        kind === 'Keyed' ? 2 : 1,
      )
      if (readField === undefined || readField !== writeField) {
        continue
      }

      const definition = {
        childField: readField,
        kind,
        ...(owner === undefined ? {} : { owner }),
      }
      fallbackByName.set(declarator.id.name, definition)
      for (const scope of scopes ?? []) {
        for (const variable of scope.variables) {
          if (variable.defs.some(candidate => candidate.node === declarator)) {
            byVariable.set(variable, definition)
          }
        }
      }
    }
  }

  return { byVariable, fallbackByName, writeCallbacks }
}

type CompositionDefinition = Readonly<{
  childBindings: ReadonlyArray<FoldDefinition>
}>

const compositionDefinitions = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Readonly<{
  byVariable: WeakMap<Variable, CompositionDefinition>
  fallbackByName: ReadonlyMap<string, CompositionDefinition>
}> => {
  const byVariable = new WeakMap<Variable, CompositionDefinition>()
  const fallbackByName = new Map<string, CompositionDefinition>()

  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }

    for (const declarator of declaration.declarations) {
      if (!isIdentifier(declarator.id) || !isCallExpression(declarator.init)) {
        continue
      }
      if (
        !isOwnedDefinitionCall(declarator.init, 'makeComposition', references)
      ) {
        continue
      }

      const owner = definitionOwner(
        declarator.init,
        'makeComposition',
        references,
      )
      const [configuration] = declarator.init.arguments
      if (owner === undefined || !isObjectExpression(configuration)) {
        continue
      }

      const childBindings = propertyValue(configuration, 'childBindings')
      if (!isArrayExpression(childBindings)) {
        continue
      }

      const registeredBindings = childBindings.elements.flatMap(binding => {
        if (!isIdentifierReference(binding)) {
          return []
        }
        const definition = foldDefinitionFor(binding, definitions, references)
        return definition?.owner !== undefined &&
          isSameDefinitionOwner(definition.owner, owner)
          ? [definition]
          : []
      })
      if (registeredBindings.length === 0) {
        continue
      }

      const definition = { childBindings: registeredBindings }
      fallbackByName.set(declarator.id.name, definition)
      for (const scope of scopes ?? []) {
        for (const variable of scope.variables) {
          if (variable.defs.some(candidate => candidate.node === declarator)) {
            byVariable.set(variable, definition)
          }
        }
      }
    }
  }

  return { byVariable, fallbackByName }
}

const compositionDefinitionForUpdate = (
  callee: unknown,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, CompositionDefinition>
    fallbackByName: ReadonlyMap<string, CompositionDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): CompositionDefinition | undefined => {
  const maybePath = staticMemberPath(callee)
  if (
    Option.isNone(maybePath) ||
    maybePath.value.members.length !== 1 ||
    maybePath.value.members[0] !== 'makeUpdate'
  ) {
    return undefined
  }

  const { root } = maybePath.value
  if (references === undefined) {
    return definitions.fallbackByName.get(root.name)
  }
  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, root), variable =>
      Option.fromNullishOr(definitions.byVariable.get(variable)),
    ),
  )
}

const foldDefinitionFor = (
  callee: unknown,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): FoldDefinition | undefined => {
  const maybePath = staticMemberPath(callee)
  const bindingReference = Option.isSome(maybePath)
    ? maybePath.value.root
    : callee

  if (!isIdentifierReference(bindingReference)) {
    return undefined
  }

  if (
    Option.isSome(maybePath) &&
    maybePath.value.members.length > 0 &&
    (maybePath.value.members.length !== 1 ||
      maybePath.value.members.some(
        member =>
          member === 'init' || member === 'embedView' || member === 'placement',
      ))
  ) {
    return undefined
  }

  if (references === undefined) {
    return definitions.fallbackByName.get(bindingReference.name)
  }
  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, bindingReference), variable =>
      Option.fromNullishOr(definitions.byVariable.get(variable)),
    ),
  )
}

const isArrayExpression = (value: unknown): value is ESTree.ArrayExpression =>
  isNode(value) && value.type === 'ArrayExpression'

const childFieldsForCombine = (
  node: ESTree.CallExpression,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): CombineStepDefinition => {
  if (!isCombineCall(node, references)) {
    return {
      childFields: new Set(),
      keyedChildFields: new Set(),
      wrappedChildFields: new Map(),
    }
  }
  const [firstArgument, secondArgument] = node.arguments
  const steps = isArrayExpression(firstArgument)
    ? firstArgument
    : isArrayExpression(secondArgument)
      ? secondArgument
      : undefined
  if (steps === undefined) {
    return {
      childFields: new Set(),
      keyedChildFields: new Set(),
      wrappedChildFields: new Map(),
    }
  }

  const childFields = new Set<string>()
  const keyedChildFields = new Set<string>()
  const wrappedChildFields = new Map<string, Set<string>>()
  const addDefinition = (definition: FoldDefinition): void => {
    childFields.add(definition.childField)
    if (definition.kind === 'Keyed') {
      keyedChildFields.add(definition.childField)
    }
    if (definition.wrappedChildField !== undefined) {
      const fields =
        wrappedChildFields.get(definition.childField) ?? new Set<string>()
      fields.add(definition.wrappedChildField)
      wrappedChildFields.set(definition.childField, fields)
    }
  }
  for (const step of steps.elements) {
    if (isIdentifierReference(step)) {
      const definition = foldDefinitionFor(step, definitions, references)
      if (definition?.kind === 'Step') {
        addDefinition(definition)
      }
      continue
    }

    if (!isCallExpression(step)) {
      continue
    }

    const definition = foldDefinitionFor(step.callee, definitions, references)
    if (definition?.kind === 'Fold' || definition?.kind === 'Keyed') {
      addDefinition(definition)
    }
  }
  return { childFields, keyedChildFields, wrappedChildFields }
}

const combineStepDefinitions = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Readonly<{
  byVariable: WeakMap<Variable, CombineStepDefinition>
  fallbackByName: ReadonlyMap<string, CombineStepDefinition>
}> => {
  const byVariable = new WeakMap<Variable, CombineStepDefinition>()
  const fallbackByName = new Map<string, CombineStepDefinition>()

  walk(program, node => {
    if (
      node.type !== 'VariableDeclarator' ||
      !isIdentifier(node.id) ||
      !isCallExpression(node.init) ||
      !isCombineCall(node.init, references)
    ) {
      return
    }
    const [firstArgument, secondArgument] = node.init.arguments
    if (!isArrayExpression(firstArgument) || secondArgument !== undefined) {
      return
    }
    const { childFields, keyedChildFields, wrappedChildFields } =
      childFieldsForCombine(node.init, definitions, references)
    if (childFields.size === 0) {
      return
    }

    const definition = { childFields, keyedChildFields, wrappedChildFields }
    fallbackByName.set(node.id.name, definition)
    for (const scope of scopes ?? []) {
      for (const variable of scope.variables) {
        if (variable.defs.some(candidate => candidate.node === node)) {
          byVariable.set(variable, definition)
        }
      }
    }
  })

  return { byVariable, fallbackByName }
}

const combineStepDefinitionFor = (
  callee: unknown,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, CombineStepDefinition>
    fallbackByName: ReadonlyMap<string, CombineStepDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): CombineStepDefinition | undefined => {
  if (!isIdentifierReference(callee)) {
    return undefined
  }
  if (references === undefined) {
    return definitions.fallbackByName.get(callee.name)
  }
  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, callee), variable =>
      Option.fromNullishOr(definitions.byVariable.get(variable)),
    ),
  )
}

const isDataLastFoldCall = (
  node: ESTree.CallExpression,
  ancestors: ReadonlyArray<ESTree.Node>,
): boolean =>
  ancestors.some(
    ancestor => isCallExpression(ancestor) && ancestor.callee === node,
  )

const invokedModel = (
  node: ESTree.CallExpression,
  ancestors: ReadonlyArray<ESTree.Node>,
): ESTree.IdentifierReference | undefined => {
  const invocation = ancestors.find(
    candidate => isCallExpression(candidate) && candidate.callee === node,
  )
  if (invocation === undefined || !isCallExpression(invocation)) {
    return undefined
  }
  const [parentModel] = invocation.arguments
  return isIdentifierReference(parentModel) ? parentModel : undefined
}

const combineModel = (
  node: ESTree.CallExpression,
  ancestors: ReadonlyArray<ESTree.Node>,
): ESTree.IdentifierReference | undefined => {
  const [firstArgument, secondArgument] = node.arguments
  if (
    isIdentifierReference(firstArgument) &&
    isArrayExpression(secondArgument)
  ) {
    return firstArgument
  }
  return isArrayExpression(firstArgument)
    ? invokedModel(node, ancestors)
    : undefined
}

const addDefinitionEvidence = (
  definition: FoldDefinition,
  parentModel: ESTree.IdentifierReference,
  childFieldsByParentModel: Map<Variable, Set<string>>,
  fallbackChildFieldsByParentModel: Map<string, Set<string>>,
  keyedChildFieldsByParentModel: Map<Variable, Set<string>>,
  fallbackKeyedChildFieldsByParentModel: Map<string, Set<string>>,
  wrappedChildFieldsByParentModel: Map<Variable, Map<string, Set<string>>>,
  fallbackWrappedChildFieldsByParentModel: Map<
    string,
    Map<string, Set<string>>
  >,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  declaredVariables: ReadonlyArray<Variable>,
): void => {
  if (references === undefined) {
    addChildField(
      fallbackChildFieldsByParentModel,
      parentModel.name,
      definition.childField,
    )
    if (definition.kind === 'Keyed') {
      addChildField(
        fallbackKeyedChildFieldsByParentModel,
        parentModel.name,
        definition.childField,
      )
    }
    if (definition.wrappedChildField !== undefined) {
      addWrappedChildField(
        fallbackWrappedChildFieldsByParentModel,
        parentModel.name,
        definition.childField,
        definition.wrappedChildField,
      )
    }
    return
  }

  const maybeVariable = Option.orElse(
    resolvedVariable(references, parentModel),
    () =>
      Option.fromNullishOr(
        declaredVariables.find(variable =>
          variable.identifiers.some(identifier => identifier === parentModel),
        ),
      ),
  )

  Option.map(maybeVariable, variable => {
    addChildField(childFieldsByParentModel, variable, definition.childField)
    if (definition.kind === 'Keyed') {
      addChildField(
        keyedChildFieldsByParentModel,
        variable,
        definition.childField,
      )
    }
    if (definition.wrappedChildField !== undefined) {
      addWrappedChildField(
        wrappedChildFieldsByParentModel,
        variable,
        definition.childField,
        definition.wrappedChildField,
      )
    }
  })
}

const foldEvidence = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): FoldEvidence => {
  const callbacks = moduleCallbacks(program)
  const definitions = foldDefinitions(program, scopes, references)
  const compositions = compositionDefinitions(
    program,
    scopes,
    definitions,
    references,
  )
  const stepDefinitions = combineStepDefinitions(
    program,
    scopes,
    definitions,
    references,
  )
  const childFieldsByParentModel = new Map<Variable, Set<string>>()
  const fallbackChildFieldsByParentModel = new Map<string, Set<string>>()
  const keyedChildFieldsByParentModel = new Map<Variable, Set<string>>()
  const fallbackKeyedChildFieldsByParentModel = new Map<string, Set<string>>()
  const wrappedChildFieldsByParentModel = new Map<
    Variable,
    Map<string, Set<string>>
  >()
  const fallbackWrappedChildFieldsByParentModel = new Map<
    string,
    Map<string, Set<string>>
  >()
  const declaredVariables = (scopes ?? []).flatMap(scope => scope.variables)
  const addEvidence = (
    definition: FoldDefinition,
    parentModel: ESTree.IdentifierReference,
  ): void =>
    addDefinitionEvidence(
      definition,
      parentModel,
      childFieldsByParentModel,
      fallbackChildFieldsByParentModel,
      keyedChildFieldsByParentModel,
      fallbackKeyedChildFieldsByParentModel,
      wrappedChildFieldsByParentModel,
      fallbackWrappedChildFieldsByParentModel,
      references,
      declaredVariables,
    )
  const addCombineEvidence = (
    definition: CombineStepDefinition,
    parentModel: ESTree.IdentifierReference,
  ): void => {
    for (const childField of definition.childFields) {
      const kind = definition.keyedChildFields.has(childField)
        ? 'Keyed'
        : 'Step'
      const wrappedChildFields = definition.wrappedChildFields.get(childField)
      if (wrappedChildFields === undefined) {
        addEvidence({ childField, kind }, parentModel)
        continue
      }

      for (const wrappedChildField of wrappedChildFields) {
        addEvidence({ childField, kind, wrappedChildField }, parentModel)
      }
    }
  }

  walk(program, (node, ancestors) => {
    if (!isCallExpression(node)) {
      return
    }

    const composition = compositionDefinitionForUpdate(
      node.callee,
      compositions,
      references,
    )
    if (composition !== undefined) {
      const [updateValue] = node.arguments
      const update = callbackValue(updateValue, callbacks)
      const [parentModel] = update?.params ?? []
      if (isIdentifierReference(parentModel)) {
        for (const childBinding of composition.childBindings) {
          addEvidence(childBinding, parentModel)
        }
      }
    }

    const parentModelForCombine = isCombineCall(node, references)
      ? combineModel(node, ancestors)
      : undefined
    if (parentModelForCombine !== undefined) {
      const childFields = childFieldsForCombine(node, definitions, references)
      addCombineEvidence(childFields, parentModelForCombine)
    }

    if (isDataLastFoldCall(node, ancestors)) {
      return
    }

    const stepDefinition = combineStepDefinitionFor(
      node.callee,
      stepDefinitions,
      references,
    )
    if (stepDefinition !== undefined) {
      const [parentModel] = node.arguments
      if (!isIdentifierReference(parentModel)) {
        return
      }
      addCombineEvidence(stepDefinition, parentModel)
      return
    }

    const directDefinition = foldDefinitionFor(
      node.callee,
      definitions,
      references,
    )
    const dataLastDefinition = isCallExpression(node.callee)
      ? foldDefinitionFor(node.callee.callee, definitions, references)
      : undefined
    if (directDefinition === undefined && dataLastDefinition === undefined) {
      return
    }

    const [firstArgument, secondArgument, thirdArgument] = node.arguments
    if (directDefinition?.kind === 'Fold' && secondArgument === undefined) {
      return
    }
    if (directDefinition?.kind === 'Keyed' && thirdArgument === undefined) {
      return
    }
    if (dataLastDefinition?.kind === 'Step') {
      return
    }
    const definition = directDefinition ?? dataLastDefinition
    const parentModel = firstArgument
    if (!isIdentifierReference(parentModel) || definition === undefined) {
      return
    }

    addEvidence(definition, parentModel)
  })
  return {
    childFieldsByParentModel,
    fallbackChildFieldsByParentModel,
    keyedChildFieldsByParentModel,
    fallbackKeyedChildFieldsByParentModel,
    wrappedChildFieldsByParentModel,
    fallbackWrappedChildFieldsByParentModel,
    writeCallbacks: definitions.writeCallbacks,
  }
}

const keyedChildArrayUpdater = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.ArrowFunctionExpression | undefined => {
  if (!isCallExpression(expression)) {
    return undefined
  }

  const [firstArgument, secondArgument] = expression.arguments
  const staticMap =
    references === undefined
      ? Option.exists(staticMemberPath(expression.callee), path => {
          const [method, extraMember] = path.members
          return (
            path.root.name === 'Array' &&
            method === 'map' &&
            extraMember === undefined
          )
        })
      : Option.exists(
          resolveImportedPath(references, expression.callee),
          path => {
            const [firstMember, secondMember, extraMember] = path.members
            return (
              (path.source === 'effect' &&
                firstMember === 'Array' &&
                secondMember === 'map' &&
                extraMember === undefined) ||
              (path.source === 'effect/Array' &&
                firstMember === 'map' &&
                secondMember === undefined)
            )
          },
        )

  if (
    staticMap &&
    childrenName === undefined &&
    secondArgument === undefined &&
    isArrowFunction(firstArgument)
  ) {
    return firstArgument
  }

  if (
    staticMap &&
    childrenName !== undefined &&
    isIdentifier(firstArgument, childrenName) &&
    isArrowFunction(secondArgument)
  ) {
    return secondArgument
  }

  if (
    isMemberExpression(expression.callee) &&
    !expression.callee.computed &&
    childrenName !== undefined &&
    isIdentifier(expression.callee.object, childrenName) &&
    isIdentifier(expression.callee.property, 'map') &&
    isArrowFunction(firstArgument)
  ) {
    return firstArgument
  }

  return undefined
}

const updatesKeyedChildArray = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const updater = keyedChildArrayUpdater(expression, childrenName, references)
  if (updater === undefined) {
    return false
  }

  const [childModel] = updater.params
  if (!isIdentifier(childModel)) {
    return false
  }

  return expressionsReturnedBy(updater).some(returned => {
    if (
      !isCallExpression(returned) ||
      !isModifyFieldsCall(returned, references)
    ) {
      return false
    }

    const [updatedModel] = returned.arguments
    return isIdentifier(updatedModel, childModel.name)
  })
}

const updatesWrappedKeyedChildArray = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  childFields: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const updater = keyedChildArrayUpdater(expression, childrenName, references)
  if (updater === undefined) {
    return false
  }

  const [wrapper] = updater.params
  if (!isIdentifier(wrapper)) {
    return false
  }

  return expressionsReturnedBy(updater).some(returned => {
    let updatesChild = false
    walk(returned, (node, ancestors) => {
      if (
        updatesChild ||
        ancestors.some(isFunction) ||
        !isCallExpression(node) ||
        !isModifyFieldsCall(node, references)
      ) {
        return
      }

      const [updatedModel, updates] = node.arguments
      if (
        !isIdentifier(updatedModel, wrapper.name) ||
        !isObjectExpression(updates)
      ) {
        return
      }

      updatesChild = updates.properties.some(
        property =>
          property.type === 'Property' &&
          Option.exists(staticPropertyName(property), childField =>
            childFields.has(childField),
          ),
      )
    })
    return updatesChild
  })
}

const directChildModifyFieldsField = (
  node: ESTree.CallExpression,
  evidence: FoldEvidence,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): string | undefined => {
  if (!isModifyFieldsCall(node, references)) {
    return undefined
  }
  const [model, updates] = node.arguments
  if (!isIdentifierReference(model) || !isObjectExpression(updates)) {
    return undefined
  }
  const childFields =
    references === undefined
      ? evidence.fallbackChildFieldsByParentModel.get(model.name)
      : Option.getOrUndefined(
          Option.flatMap(resolvedVariable(references, model), variable =>
            Option.fromNullishOr(
              evidence.childFieldsByParentModel.get(variable),
            ),
          ),
        )
  if (childFields === undefined) {
    return undefined
  }
  const keyedChildFields =
    references === undefined
      ? evidence.fallbackKeyedChildFieldsByParentModel.get(model.name)
      : Option.getOrUndefined(
          Option.flatMap(resolvedVariable(references, model), variable =>
            Option.fromNullishOr(
              evidence.keyedChildFieldsByParentModel.get(variable),
            ),
          ),
        )
  const wrappedChildFields =
    references === undefined
      ? evidence.fallbackWrappedChildFieldsByParentModel.get(model.name)
      : Option.getOrUndefined(
          Option.flatMap(resolvedVariable(references, model), variable =>
            Option.fromNullishOr(
              evidence.wrappedChildFieldsByParentModel.get(variable),
            ),
          ),
        )
  for (const property of updates.properties) {
    if (
      property.type !== 'Property' ||
      property.computed ||
      !isIdentifier(property.key) ||
      !childFields.has(property.key.name)
    ) {
      continue
    }

    if (
      keyedChildFields?.has(property.key.name) === true &&
      isCallExpression(property.value) &&
      (wrappedChildFields?.get(property.key.name) === undefined
        ? updatesKeyedChildArray(property.value, undefined, references)
        : updatesWrappedKeyedChildArray(
            property.value,
            undefined,
            wrappedChildFields.get(property.key.name) ?? new Set(),
            references,
          ))
    ) {
      return property.key.name
    }

    if (!isArrowFunction(property.value)) {
      continue
    }

    const [childModel] = property.value.params
    if (!isIdentifier(childModel)) {
      continue
    }
    for (const nestedUpdate of expressionsReturnedBy(property.value)) {
      if (
        keyedChildFields?.has(property.key.name) === true &&
        (wrappedChildFields?.get(property.key.name) === undefined
          ? updatesKeyedChildArray(nestedUpdate, childModel.name, references)
          : updatesWrappedKeyedChildArray(
              nestedUpdate,
              childModel.name,
              wrappedChildFields.get(property.key.name) ?? new Set(),
              references,
            ))
      ) {
        return property.key.name
      }
      if (
        !isCallExpression(nestedUpdate) ||
        !isModifyFieldsCall(nestedUpdate, references)
      ) {
        continue
      }
      const [nestedModel] = nestedUpdate.arguments
      if (isIdentifier(nestedModel, childModel.name)) {
        return property.key.name
      }
    }
  }
  return undefined
}

/** Flags parent-owned modifyFields calls that directly update a child Block Model. */
export const noDirectBlockStateUpdate = Rule.define({
  name: 'no-direct-block-state-update',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep Block state changes inside child-owned update capabilities.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      'Program:exit': (node: ESTree.Node) => {
        if (node.type !== 'Program') {
          return Effect.void
        }
        const evidence = foldEvidence(node, scopes, references)
        if (
          evidence.childFieldsByParentModel.size === 0 &&
          evidence.fallbackChildFieldsByParentModel.size === 0
        ) {
          return Effect.void
        }
        return Effect.forEach(
          (() => {
            const findings: Array<
              Readonly<{ node: ESTree.CallExpression; fieldName: string }>
            > = []
            walk(node, (candidate, ancestors) => {
              if (!isCallExpression(candidate)) {
                return
              }
              if (
                ancestors.some(ancestor =>
                  evidence.writeCallbacks.has(ancestor),
                )
              ) {
                return
              }
              const fieldName = directChildModifyFieldsField(
                candidate,
                evidence,
                references,
              )
              if (fieldName !== undefined) {
                findings.push({ node: candidate, fieldName })
              }
            })
            return findings
          })(),
          ({ node: findingNode, fieldName }) =>
            ctx.report(
              Diagnostic.make({
                node: findingNode,
                message: directBlockStateUpdateMessage(fieldName),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
