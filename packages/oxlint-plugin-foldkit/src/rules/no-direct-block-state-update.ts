import { Array, Effect, Option } from 'effect'
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
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticMemberName,
  staticPropertyName,
  staticStringValue,
  blockBindingChild,
  blockBindingMethod,
  blockBindingConfiguration,
  blockBindingParent,
  definitionMethodOwnerPath,
  isOwnedDefinitionCall,
  isVariableDeclaration,
} from '../guards.ts'

const directBlockStateUpdateMessage = (fieldName: string): string =>
  `Do not update the Block field \`${fieldName}\` directly from its parent. Expose the local Message constructor through the child Block's \`operations\` record, then call the named method on the registered Binding so the child update handles the transition.`

const discardedChildReturnMessage = (
  fieldName: string,
  helperLabel: string,
  resultName: string,
): string =>
  `The parent writes \`${resultName}.model\` into \`${fieldName}\` after calling \`${helperLabel}\`. A child Return can include Commands or an OutMessage that this copy ignores. Apply the child operation through the registered Binding's named method.`

type ChildReturnOrigin = Readonly<{
  childField: string
  helperLabel: string
  parentModel: ESTree.IdentifierReference
}>

type ChildReturnOrigins = Readonly<{
  byVariable: WeakMap<Variable, ChildReturnOrigin>
  fallbackByName: ReadonlyMap<string, ChildReturnOrigin>
}>

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
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  isNode(node) &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

const expressionsReturnedBy = (
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlyArray<ESTree.Expression> => {
  if (callback.body === null) {
    return []
  }
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

const onlyReturnedModelField = (
  callback: ESTree.ArrowFunctionExpression,
): string | undefined => {
  const [modelParameter] = callback.params
  const returned = expressionReturnedBy(callback)
  if (!isIdentifier(modelParameter) || returned === undefined) {
    return undefined
  }

  const fields = new Set<string>()
  walk(returned, node => {
    const field = directMemberField(node, modelParameter.name)
    if (field !== undefined) {
      fields.add(field)
    }
  })

  return fields.size === 1 ? fields.values().next().value : undefined
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

const definitionOwnerForPath = (
  path: Readonly<{
    root: ESTree.IdentifierReference
    members: ReadonlyArray<string>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DefinitionOwner => ({
  fallbackRootName: path.root.name,
  members: path.members,
  ...(references === undefined
    ? {}
    : Option.match(resolvedVariable(references, path.root), {
        onNone: () => ({}),
        onSome: variable => ({ variable }),
      })),
})

const definitionOwnerForExpression = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DefinitionOwner | undefined => {
  const maybePath = staticMemberPath(node)
  if (Option.isNone(maybePath)) {
    return undefined
  }

  return definitionOwnerForPath(maybePath.value, references)
}

const definitionOwner = (
  node: ESTree.CallExpression,
  methodName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DefinitionOwner | undefined => {
  const maybePath = definitionMethodOwnerPath(node.callee, methodName)
  if (Option.isNone(maybePath)) {
    return undefined
  }

  return definitionOwnerForPath(maybePath.value, references)
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

const isCombineStepsCall = (
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
        helperName === 'combineSteps' &&
        extraMember === undefined
      )
    })
  }
  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'Update' &&
      helperName === 'combineSteps' &&
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

type ChildBlockOwner = Readonly<{
  fallbackRootName: string
  localPrefix: ReadonlyArray<string>
  imported?: Readonly<{
    members: ReadonlyArray<string>
    source: string
  }>
  variable?: Variable
}>

const pathPrefix = (members: ReadonlyArray<string>): ReadonlyArray<string> =>
  members.slice(0, -1)

const childBlockOwner = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ChildBlockOwner | undefined => {
  const maybePath = staticMemberPath(node)
  if (Option.isNone(maybePath)) {
    return undefined
  }

  const { root, members } = maybePath.value
  const localPrefix = members.length === 0 ? [] : pathPrefix(members)
  if (references === undefined) {
    return { fallbackRootName: root.name, localPrefix }
  }

  const imported = Option.getOrUndefined(resolveImportedPath(references, node))
  return {
    fallbackRootName: root.name,
    localPrefix,
    ...(imported === undefined
      ? {}
      : { imported: { members: imported.members, source: imported.source } }),
    ...Option.match(resolvedVariable(references, root), {
      onNone: () => ({}),
      onSome: variable => ({ variable }),
    }),
  }
}

const samePathPrefix = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  left.length === right.length &&
  left.every((member, index) => member === right[index])

const ownerMatchesPath = (
  owner: ChildBlockOwner,
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const candidate = childBlockOwner(node, references)
  if (candidate === undefined) {
    return false
  }

  const sameRoot =
    owner.variable !== undefined || candidate.variable !== undefined
      ? owner.variable !== undefined && owner.variable === candidate.variable
      : owner.fallbackRootName === candidate.fallbackRootName
  if (sameRoot && samePathPrefix(owner.localPrefix, candidate.localPrefix)) {
    return true
  }

  const ownerImport = owner.imported
  const candidateImport = candidate.imported
  if (
    ownerImport === undefined ||
    candidateImport === undefined ||
    ownerImport.source !== candidateImport.source
  ) {
    return false
  }

  return (
    ownerImport.members.length === 1 &&
    ownerImport.members[0] === 'block' &&
    candidateImport.members.length === 1
  )
}

type FoldDefinition = Readonly<{
  childOwner?: ChildBlockOwner
  childField: string
  kind: FoldKind
  owner?: DefinitionOwner
  wrappedChildField?: string
}>

type CombineStepDefinition = Readonly<{
  bindings: ReadonlyArray<FoldDefinition>
  stepFieldsCalls: ReadonlySet<ESTree.CallExpression>
}>

type FoldEvidence = Readonly<{
  registrationsByParentModel: ReadonlyMap<
    Variable,
    ReadonlyMap<string, ReadonlyArray<FoldDefinition>>
  >
  fallbackRegistrationsByParentModel: ReadonlyMap<
    string,
    ReadonlyMap<string, ReadonlyArray<FoldDefinition>>
  >
  parentModelByStepFieldsCall: WeakMap<
    ESTree.CallExpression,
    ESTree.IdentifierReference
  >
  registrationsByStepFieldsCall: ReadonlyMap<
    ESTree.CallExpression,
    ReadonlyMap<string, ReadonlyArray<FoldDefinition>>
  >
  writeCallbacks: ReadonlySet<ESTree.Node>
}>

const registrationsForModel = (
  parentModel: ESTree.IdentifierReference | undefined,
  evidence: FoldEvidence,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyMap<string, ReadonlyArray<FoldDefinition>> | undefined => {
  if (parentModel === undefined) {
    return undefined
  }
  if (references === undefined) {
    return evidence.fallbackRegistrationsByParentModel.get(parentModel.name)
  }
  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, parentModel), variable =>
      Option.fromNullishOr(evidence.registrationsByParentModel.get(variable)),
    ),
  )
}

const addRegistration = <Key>(
  registrationsByParentModel: Map<Key, Map<string, Array<FoldDefinition>>>,
  parentModel: Key,
  definition: FoldDefinition,
): void => {
  const registrationsByChildField =
    registrationsByParentModel.get(parentModel) ??
    new Map<string, Array<FoldDefinition>>()
  const registrations =
    registrationsByChildField.get(definition.childField) ?? []
  if (!registrations.includes(definition)) {
    registrations.push(definition)
  }
  registrationsByChildField.set(definition.childField, registrations)
  registrationsByParentModel.set(parentModel, registrationsByChildField)
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
  const registerDefinition = (
    declarator: ESTree.VariableDeclarator,
    name: string,
    definition: FoldDefinition,
  ): void => {
    fallbackByName.set(name, definition)
    for (const scope of scopes ?? []) {
      for (const variable of scope.variables) {
        if (variable.defs.some(candidate => candidate.node === declarator)) {
          byVariable.set(variable, definition)
        }
      }
    }
  }

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

      const configuration = blockBindingConfiguration(
        declarator.init,
        references,
      )
      if (!isObjectExpression(configuration)) {
        continue
      }

      const bindingMethod = blockBindingMethod(declarator.init, references)
      const boundChild = blockBindingChild(declarator.init, references)
      const childOwner = Option.isSome(bindingMethod)
        ? childBlockOwner(boundChild, references)
        : undefined
      const owner = Option.isSome(bindingMethod)
        ? definitionOwnerForExpression(
            blockBindingParent(declarator.init, references),
            references,
          )
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
          ...(childOwner === undefined ? {} : { childOwner }),
          ...(owner === undefined ? {} : { owner }),
          ...(wrappedChildField === undefined ? {} : { wrappedChildField }),
        }
        registerDefinition(declarator, declarator.id.name, definition)
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
      const readField =
        directReadField(read) ??
        (Option.contains(bindingMethod, 'Keyed')
          ? onlyReturnedModelField(read)
          : undefined)
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
        ...(childOwner === undefined ? {} : { childOwner }),
        ...(owner === undefined ? {} : { owner }),
      }
      registerDefinition(declarator, declarator.id.name, definition)
    }
  }

  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }

    for (const declarator of declaration.declarations) {
      if (
        !isIdentifier(declarator.id) ||
        !isCallExpression(declarator.init) ||
        !isMemberExpression(declarator.init.callee) ||
        !Option.contains(
          staticMemberName(declarator.init.callee),
          'withOutMessagePolicy',
        ) ||
        !isIdentifierReference(declarator.init.callee.object)
      ) {
        continue
      }

      const definition = foldDefinitionFor(
        declarator.init.callee.object,
        { byVariable, fallbackByName },
        references,
      )
      if (definition !== undefined) {
        registerDefinition(declarator, declarator.id.name, definition)
      }
    }
  }

  return { byVariable, fallbackByName, writeCallbacks }
}

type CompositionDefinition = Readonly<{
  bindings: ReadonlyArray<FoldDefinition>
}>

type CompositionUpdate = Readonly<{
  definition: CompositionDefinition
  kind: 'Direct' | 'WithContext'
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

      const bindings = propertyValue(configuration, 'bindings')
      if (!isArrayExpression(bindings)) {
        continue
      }

      const registeredBindings = bindings.elements.flatMap(binding => {
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

      const definition = { bindings: registeredBindings }
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
): CompositionUpdate | undefined => {
  const maybePath = staticMemberPath(callee)
  if (
    Option.isNone(maybePath) ||
    (maybePath.value.members.join('.') !== 'makeUpdate' &&
      maybePath.value.members.join('.') !== 'makeUpdate.withContext')
  ) {
    return undefined
  }

  const { root } = maybePath.value
  const kind = maybePath.value.members.length === 1 ? 'Direct' : 'WithContext'
  if (references === undefined) {
    const definition = definitions.fallbackByName.get(root.name)
    return definition === undefined ? undefined : { definition, kind }
  }
  const definition = Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, root), variable =>
      Option.fromNullishOr(definitions.byVariable.get(variable)),
    ),
  )
  return definition === undefined ? undefined : { definition, kind }
}

const resolvedObjectValue = (
  value: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.ObjectExpression | undefined => {
  if (isObjectExpression(value)) {
    return value
  }
  if (references === undefined || !isIdentifierReference(value)) {
    return undefined
  }

  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, value), variable =>
      Array.head(
        variable.defs.flatMap(definition =>
          isVariableDeclarator(definition.node) &&
          isObjectExpression(definition.node.init)
            ? [definition.node.init]
            : [],
        ),
      ),
    ),
  )
}

const resolvedCallbackValue = (
  value: unknown,
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.ArrowFunctionExpression | ESTree.Function | undefined => {
  if (references !== undefined && isIdentifierReference(value)) {
    return localFunction(value, references)
  }
  return isFunction(value) ? value : callbackValue(value, callbacks)
}

const compositionUpdateHandlers = (
  node: ESTree.CallExpression,
  kind: CompositionUpdate['kind'],
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<ESTree.ObjectProperty['value']> => {
  const handlerValues = (handlers: ESTree.ObjectExpression) =>
    handlers.properties.flatMap(property =>
      property.type === 'Property' ? [property.value] : [],
    )
  const [authored] = node.arguments
  if (kind === 'Direct') {
    const handlers = resolvedObjectValue(authored, references)
    return handlers === undefined ? [] : handlerValues(handlers)
  }

  const createCases = resolvedCallbackValue(authored, callbacks, references)
  if (createCases === undefined) {
    return []
  }

  return expressionsReturnedBy(createCases).flatMap(returned => {
    const handlers = resolvedObjectValue(returned, references)
    return handlers === undefined ? [] : handlerValues(handlers)
  })
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

const ownedStepFieldsCallFor = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: ReadonlySet<Variable> = new Set(),
): ESTree.CallExpression | undefined => {
  if (isCallExpression(node)) {
    return isOwnedDefinitionCall(node, 'makeFieldsStep', references)
      ? node
      : undefined
  }
  if (references === undefined || !isIdentifierReference(node)) {
    return undefined
  }

  return Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, node), variable => {
      if (visited.has(variable) || variable.defs.length !== 1) {
        return Option.none()
      }
      return Option.flatMap(Array.head(variable.defs), definition => {
        if (
          !isVariableDeclarator(definition.node) ||
          !isVariableDeclaration(definition.node.parent) ||
          definition.node.parent.kind !== 'const'
        ) {
          return Option.none()
        }
        return Option.fromNullishOr(
          ownedStepFieldsCallFor(
            definition.node.init,
            references,
            new Set([...visited, variable]),
          ),
        )
      })
    }),
  )
}

const modelParameterForFieldsStep = (
  node: ESTree.CallExpression,
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.IdentifierReference | undefined => {
  if (
    Option.exists(staticMemberPath(node.callee), path =>
      Option.contains(Array.last(path.members), 'fromMessage'),
    )
  ) {
    return undefined
  }
  const [authored] = node.arguments
  const callback = resolvedCallbackValue(authored, callbacks, references)
  const [model] = callback?.params ?? []
  return isIdentifierReference(model) ? model : undefined
}

const childFieldsForCombine = (
  node: ESTree.CallExpression,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): CombineStepDefinition => {
  if (!isCombineStepsCall(node, references)) {
    return {
      bindings: [],
      stepFieldsCalls: new Set(),
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
      bindings: [],
      stepFieldsCalls: new Set(),
    }
  }

  const bindings: Array<FoldDefinition> = []
  const stepFieldsCalls = new Set<ESTree.CallExpression>()
  for (const step of steps.elements) {
    const stepFieldsCall = ownedStepFieldsCallFor(step, references)
    if (stepFieldsCall !== undefined) {
      stepFieldsCalls.add(stepFieldsCall)
      continue
    }
    if (isIdentifierReference(step)) {
      const definition = foldDefinitionFor(step, definitions, references)
      if (definition?.kind === 'Step') {
        bindings.push(definition)
      }
      continue
    }

    if (!isCallExpression(step)) {
      continue
    }

    const definition = foldDefinitionFor(step.callee, definitions, references)
    if (definition?.kind === 'Fold' || definition?.kind === 'Keyed') {
      bindings.push(definition)
    }
  }
  return { bindings, stepFieldsCalls }
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
      !isCombineStepsCall(node.init, references)
    ) {
      return
    }
    const [firstArgument, secondArgument] = node.init.arguments
    if (!isArrayExpression(firstArgument) || secondArgument !== undefined) {
      return
    }
    const { bindings, stepFieldsCalls } = childFieldsForCombine(
      node.init,
      definitions,
      references,
    )
    if (bindings.length === 0 && stepFieldsCalls.size === 0) {
      return
    }

    const definition = { bindings, stepFieldsCalls }
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
  registrationsByParentModel: Map<Variable, Map<string, Array<FoldDefinition>>>,
  fallbackRegistrationsByParentModel: Map<
    string,
    Map<string, Array<FoldDefinition>>
  >,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  declaredVariables: ReadonlyArray<Variable>,
): void => {
  if (references === undefined) {
    addRegistration(
      fallbackRegistrationsByParentModel,
      parentModel.name,
      definition,
    )
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
    addRegistration(registrationsByParentModel, variable, definition)
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
  const registrationsByParentModel = new Map<
    Variable,
    Map<string, Array<FoldDefinition>>
  >()
  const fallbackRegistrationsByParentModel = new Map<
    string,
    Map<string, Array<FoldDefinition>>
  >()
  const parentModelByStepFieldsCall = new WeakMap<
    ESTree.CallExpression,
    ESTree.IdentifierReference
  >()
  const registrationsByStepFieldsCall = new Map<
    ESTree.CallExpression,
    Map<string, Array<FoldDefinition>>
  >()
  const declaredVariables = (scopes ?? []).flatMap(scope => scope.variables)
  const helperCalls: Array<
    Readonly<{
      source: ESTree.IdentifierReference
      target: ESTree.IdentifierReference
      owner?: DefinitionOwner
    }>
  > = []
  const addEvidence = (
    definition: FoldDefinition,
    parentModel: ESTree.IdentifierReference,
  ): void =>
    addDefinitionEvidence(
      definition,
      parentModel,
      registrationsByParentModel,
      fallbackRegistrationsByParentModel,
      references,
      declaredVariables,
    )
  const addStepFieldsModelEvidence = (
    stepFieldsCall: ESTree.CallExpression,
    parentModel: ESTree.IdentifierReference,
  ): void => {
    const helperModel = modelParameterForFieldsStep(
      stepFieldsCall,
      callbacks,
      references,
    )
    const owner = definitionOwner(stepFieldsCall, 'makeFieldsStep', references)
    if (helperModel !== undefined && owner !== undefined) {
      helperCalls.push({ source: parentModel, target: helperModel, owner })
    }
  }
  const addCombineEvidence = (
    definition: CombineStepDefinition,
    parentModel: ESTree.IdentifierReference,
  ): void => {
    for (const stepFieldsCall of definition.stepFieldsCalls) {
      parentModelByStepFieldsCall.set(stepFieldsCall, parentModel)
      addStepFieldsModelEvidence(stepFieldsCall, parentModel)
    }
    for (const binding of definition.bindings) {
      addEvidence(binding, parentModel)
    }
  }
  const copyParentEvidence = (
    source: ESTree.IdentifierReference,
    target: ESTree.IdentifierReference,
    owner?: DefinitionOwner,
  ): boolean => {
    const sourceVariable =
      references === undefined
        ? undefined
        : Option.getOrUndefined(resolvedVariable(references, source))
    const registrations =
      references === undefined
        ? fallbackRegistrationsByParentModel.get(source.name)
        : sourceVariable === undefined
          ? undefined
          : registrationsByParentModel.get(sourceVariable)
    if (registrations === undefined) {
      return false
    }

    for (const definitionsByField of registrations.values()) {
      for (const definition of definitionsByField) {
        if (
          owner !== undefined &&
          (definition.owner === undefined ||
            !isSameDefinitionOwner(owner, definition.owner))
        ) {
          continue
        }
        addEvidence(definition, target)
      }
    }
    return true
  }

  walk(program, (node, ancestors) => {
    if (!isCallExpression(node)) {
      return
    }

    const [helperArgument] = node.arguments
    const helper =
      references !== undefined && isIdentifierReference(node.callee)
        ? localFunction(node.callee, references)
        : undefined
    const [helperModel] = helper?.params ?? []
    if (
      isIdentifierReference(helperArgument) &&
      isIdentifierReference(helperModel)
    ) {
      helperCalls.push({ source: helperArgument, target: helperModel })
    }

    const compositionUpdate = compositionDefinitionForUpdate(
      node.callee,
      compositions,
      references,
    )
    if (compositionUpdate !== undefined) {
      const handlers = compositionUpdateHandlers(
        node,
        compositionUpdate.kind,
        callbacks,
        references,
      )
      for (const handler of handlers) {
        const stepFieldsCall = ownedStepFieldsCallFor(handler, references)
        if (stepFieldsCall !== undefined) {
          const owner = definitionOwner(
            stepFieldsCall,
            'makeFieldsStep',
            references,
          )
          const helperModel = modelParameterForFieldsStep(
            stepFieldsCall,
            callbacks,
            references,
          )
          for (const binding of compositionUpdate.definition.bindings) {
            if (
              owner === undefined ||
              binding.owner === undefined ||
              !isSameDefinitionOwner(owner, binding.owner)
            ) {
              continue
            }
            addRegistration(
              registrationsByStepFieldsCall,
              stepFieldsCall,
              binding,
            )
            if (helperModel !== undefined) {
              addEvidence(binding, helperModel)
            }
          }
        }
        const update = resolvedCallbackValue(handler, callbacks, references)
        if (update === undefined) {
          continue
        }
        const [parentModel] = update.params
        if (isIdentifierReference(parentModel)) {
          for (const binding of compositionUpdate.definition.bindings) {
            addEvidence(binding, parentModel)
          }
        }
      }
    }

    const parentModelForCombine = isCombineStepsCall(node, references)
      ? combineModel(node, ancestors)
      : undefined
    if (parentModelForCombine !== undefined) {
      const childFields = childFieldsForCombine(node, definitions, references)
      addCombineEvidence(childFields, parentModelForCombine)
    }

    const appliedStepFields = ownedStepFieldsCallFor(node.callee, references)
    const [stepFieldsParentModel] = node.arguments
    if (
      appliedStepFields !== undefined &&
      isIdentifierReference(stepFieldsParentModel)
    ) {
      parentModelByStepFieldsCall.set(appliedStepFields, stepFieldsParentModel)
      addStepFieldsModelEvidence(appliedStepFields, stepFieldsParentModel)
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

  const pendingHelperCalls = new Set(helperCalls)
  for (
    let pass = 0;
    pass < helperCalls.length && pendingHelperCalls.size > 0;
    pass += 1
  ) {
    for (const helperCall of pendingHelperCalls) {
      if (
        copyParentEvidence(
          helperCall.source,
          helperCall.target,
          helperCall.owner,
        )
      ) {
        pendingHelperCalls.delete(helperCall)
      }
    }
  }
  return {
    registrationsByParentModel,
    fallbackRegistrationsByParentModel,
    parentModelByStepFieldsCall,
    registrationsByStepFieldsCall,
    writeCallbacks: definitions.writeCallbacks,
  }
}

const isTypeReference = (node: unknown): node is ESTree.TSTypeReference =>
  isNode(node) && node.type === 'TSTypeReference'

const annotatedType = (node: unknown): unknown => {
  if (
    !isIdentifier(node) ||
    !('typeAnnotation' in node) ||
    typeof node.typeAnnotation !== 'object' ||
    node.typeAnnotation === undefined ||
    node.typeAnnotation === null ||
    !('typeAnnotation' in node.typeAnnotation)
  ) {
    return undefined
  }
  return node.typeAnnotation.typeAnnotation
}

const functionReturnType = (
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
): unknown => callback.returnType?.typeAnnotation

const typeIsOwnedBy = (
  typeNode: unknown,
  owner: ChildBlockOwner,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  isTypeReference(typeNode) &&
  ownerMatchesPath(owner, typeNode.typeName, references)

const transformsFirstParameter = (
  callback: ESTree.ArrowFunctionExpression | ESTree.Function,
  references: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const [model] = callback.params
  if (!isIdentifier(model)) {
    return false
  }

  return expressionsReturnedBy(callback).some(returned => {
    if (
      !isCallExpression(returned) ||
      !isModifyFieldsCall(returned, references)
    ) {
      return false
    }
    const [updatedModel] = returned.arguments
    return isIdentifier(updatedModel, model.name)
  })
}

const localFunction = (
  node: ESTree.IdentifierReference,
  references: WeakMap<ESTree.Node, Reference>,
): ESTree.ArrowFunctionExpression | ESTree.Function | undefined =>
  Option.getOrUndefined(
    Option.flatMap(resolvedVariable(references, node), variable =>
      Option.fromNullishOr(
        variable.defs.flatMap(definition => {
          if (
            isVariableDeclarator(definition.node) &&
            isFunction(definition.node.init)
          ) {
            return [definition.node.init]
          }
          return isFunction(definition.node) ? [definition.node] : []
        })[0],
      ),
    ),
  )

const isOwnedLocalChildTransform = (
  node: ESTree.IdentifierReference,
  childOwners: ReadonlyArray<ChildBlockOwner>,
  references: WeakMap<ESTree.Node, Reference>,
): boolean => {
  const callback = localFunction(node, references)
  if (
    callback === undefined ||
    !transformsFirstParameter(callback, references)
  ) {
    return false
  }

  const [model] = callback.params
  const modelType = annotatedType(model)
  const returnType = functionReturnType(callback)
  return childOwners.some(
    owner =>
      typeIsOwnedBy(modelType, owner, references) &&
      typeIsOwnedBy(returnType, owner, references),
  )
}

const isOwnedChildTransform = (
  node: unknown,
  childOwners: ReadonlyArray<ChildBlockOwner>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (childOwners.length === 0) {
    return false
  }

  if (childOwners.some(owner => ownerMatchesPath(owner, node, references))) {
    return true
  }

  return (
    references !== undefined &&
    isIdentifierReference(node) &&
    isOwnedLocalChildTransform(node, childOwners, references)
  )
}

const transformDirectlyUpdatesChild = (
  value: unknown,
  childOwners: ReadonlyArray<ChildBlockOwner>,
  isKeyed: boolean,
  wrappedChildFields: ReadonlySet<string> | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (
    isKeyed &&
    isCallExpression(value) &&
    (wrappedChildFields === undefined
      ? updatesKeyedChildArray(value, undefined, childOwners, references)
      : updatesWrappedKeyedChildArray(
          value,
          undefined,
          wrappedChildFields,
          references,
        ))
  ) {
    return true
  }

  if (
    (isCallExpression(value) && isLegacyReflectCall(value)) ||
    isOwnedChildTransform(value, childOwners, references)
  ) {
    return true
  }

  if (!isArrowFunction(value)) {
    return false
  }

  const [childModel] = value.params
  if (!isIdentifier(childModel)) {
    return false
  }

  return expressionsReturnedBy(value).some(returned => {
    if (isCallExpression(returned) && isLegacyReflectCall(returned)) {
      return true
    }
    if (
      isKeyed &&
      (wrappedChildFields === undefined
        ? updatesKeyedChildArray(
            returned,
            childModel.name,
            childOwners,
            references,
          )
        : updatesWrappedKeyedChildArray(
            returned,
            childModel.name,
            wrappedChildFields,
            references,
          ))
    ) {
      return true
    }
    if (
      !isCallExpression(returned) ||
      !isModifyFieldsCall(returned, references)
    ) {
      return false
    }
    const [nestedModel] = returned.arguments
    return isIdentifier(nestedModel, childModel.name)
  })
}

const directChildStepFieldsField = (
  node: ESTree.CallExpression,
  evidence: FoldEvidence,
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DirectChildStateUpdate | undefined => {
  if (!isOwnedDefinitionCall(node, 'makeFieldsStep', references)) {
    return undefined
  }

  const stepOwner = definitionOwner(node, 'makeFieldsStep', references)
  const parentModel = evidence.parentModelByStepFieldsCall.get(node)
  if (stepOwner === undefined) {
    return undefined
  }

  const registrations =
    evidence.registrationsByStepFieldsCall.get(node) ??
    registrationsForModel(parentModel, evidence, references)
  if (registrations === undefined) {
    return undefined
  }
  const [callbackNode] = node.arguments
  const callback = resolvedCallbackValue(callbackNode, callbacks, references)
  if (callback === undefined) {
    return undefined
  }

  for (const returned of expressionsReturnedBy(callback)) {
    if (!isObjectExpression(returned)) {
      continue
    }
    for (const property of returned.properties) {
      if (property.type !== 'Property') {
        continue
      }
      const fieldName = Option.getOrUndefined(staticPropertyName(property))
      const fieldRegistrations =
        fieldName === undefined
          ? []
          : (registrations.get(fieldName) ?? []).filter(
              registration =>
                registration.owner !== undefined &&
                isSameDefinitionOwner(registration.owner, stepOwner),
            )
      if (fieldName === undefined || fieldRegistrations.length === 0) {
        continue
      }

      const childOwners = fieldRegistrations.flatMap(registration =>
        registration.childOwner === undefined ? [] : [registration.childOwner],
      )
      const wrappedChildFields = new Set(
        fieldRegistrations.flatMap(registration =>
          registration.wrappedChildField === undefined
            ? []
            : [registration.wrappedChildField],
        ),
      )

      if (
        transformDirectlyUpdatesChild(
          property.value,
          childOwners,
          fieldRegistrations.some(
            registration => registration.kind === 'Keyed',
          ),
          wrappedChildFields.size === 0 ? undefined : wrappedChildFields,
          references,
        )
      ) {
        return {
          fieldName,
          message: directBlockStateUpdateMessage(fieldName),
        }
      }
    }
  }
  return undefined
}

const keyedChildCollectionUpdaters = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<unknown> => {
  if (!isCallExpression(expression)) {
    return []
  }

  const isHashMapModify = (callee: unknown): boolean =>
    references !== undefined &&
    Option.exists(resolveImportedPath(references, callee), path => {
      const [firstMember, secondMember, extraMember] = path.members
      return (
        (path.source === 'effect' &&
          firstMember === 'HashMap' &&
          secondMember === 'modify' &&
          extraMember === undefined) ||
        (path.source === 'effect/HashMap' &&
          firstMember === 'modify' &&
          secondMember === undefined)
      )
    })

  const isPipe = (callee: unknown): boolean =>
    references !== undefined &&
    Option.exists(resolveImportedPath(references, callee), path => {
      const [firstMember, secondMember, extraMember] = path.members
      return (
        (path.source === 'effect' &&
          ((firstMember === 'pipe' && secondMember === undefined) ||
            (firstMember === 'Function' &&
              secondMember === 'pipe' &&
              extraMember === undefined))) ||
        (path.source === 'effect/Function' &&
          firstMember === 'pipe' &&
          secondMember === undefined)
      )
    })

  const [firstArgument, secondArgument, thirdArgument] = expression.arguments
  const hashMapModify = isHashMapModify(expression.callee)

  if (hashMapModify && thirdArgument === undefined && isNode(secondArgument)) {
    return [secondArgument]
  }

  if (
    hashMapModify &&
    childrenName !== undefined &&
    isIdentifier(firstArgument, childrenName) &&
    isNode(thirdArgument)
  ) {
    return [thirdArgument]
  }

  if (
    childrenName !== undefined &&
    isCallExpression(expression.callee) &&
    isHashMapModify(expression.callee.callee)
  ) {
    const [key, updater, extraModifyArgument] = expression.callee.arguments
    const [children, extraChildrenArgument] = expression.arguments
    if (
      isNode(key) &&
      isNode(updater) &&
      extraModifyArgument === undefined &&
      isIdentifier(children, childrenName) &&
      extraChildrenArgument === undefined
    ) {
      return [updater]
    }
  }

  if (
    childrenName !== undefined &&
    isPipe(expression.callee) &&
    isIdentifier(firstArgument, childrenName)
  ) {
    return Array.flatMap(Array.drop(expression.arguments, 1), operator => {
      if (!isCallExpression(operator) || !isHashMapModify(operator.callee)) {
        return []
      }

      const [key, updater, extraModifyArgument] = operator.arguments
      return isNode(key) && isNode(updater) && extraModifyArgument === undefined
        ? [updater]
        : []
    })
  }

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
    isNode(firstArgument)
  ) {
    return [firstArgument]
  }

  if (
    staticMap &&
    childrenName !== undefined &&
    isIdentifier(firstArgument, childrenName) &&
    isNode(secondArgument)
  ) {
    return [secondArgument]
  }

  if (
    isMemberExpression(expression.callee) &&
    !expression.callee.computed &&
    childrenName !== undefined &&
    isIdentifier(expression.callee.object, childrenName) &&
    isIdentifier(expression.callee.property, 'map') &&
    isNode(firstArgument)
  ) {
    return [firstArgument]
  }

  return []
}

const updatesKeyedChildArray = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  childOwners: ReadonlyArray<ChildBlockOwner>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const updaters = keyedChildCollectionUpdaters(
    expression,
    childrenName,
    references,
  )

  return updaters.some(updater => {
    if (isOwnedChildTransform(updater, childOwners, references)) {
      return true
    }

    if (!isArrowFunction(updater)) {
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
  })
}

const updatesWrappedKeyedChildArray = (
  expression: ESTree.Expression,
  childrenName: string | undefined,
  childFields: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const updaters = keyedChildCollectionUpdaters(
    expression,
    childrenName,
    references,
  )

  return updaters.some(updater => {
    if (!isArrowFunction(updater)) {
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
  })
}

const isLegacyReflectCall = (node: ESTree.CallExpression): boolean =>
  Option.exists(staticMemberPath(node.callee), path =>
    Option.exists(Option.fromNullishOr(path.members.at(-1)), member =>
      /^reflect(?:$|[A-Z])/u.test(member),
    ),
  )

const childReturnOrigin = (
  node: ESTree.VariableDeclarator,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ChildReturnOrigin | undefined => {
  if (!isIdentifier(node.id) || !isCallExpression(node.init)) {
    return undefined
  }

  const [childModel] = node.init.arguments
  const maybeChildPath = staticMemberPath(childModel)
  const maybeCalleePath = staticMemberPath(node.init.callee)
  if (Option.isNone(maybeChildPath) || Option.isNone(maybeCalleePath)) {
    return undefined
  }

  const [childField, extraChildMember] = maybeChildPath.value.members
  const [helperName, extraHelperMember] = maybeCalleePath.value.members
  if (
    childField === undefined ||
    extraChildMember !== undefined ||
    helperName === undefined ||
    extraHelperMember !== undefined
  ) {
    return undefined
  }

  if (references === undefined) {
    if (!/^[A-Z]/u.test(maybeCalleePath.value.root.name)) {
      return undefined
    }
  } else {
    const imported = resolveImportedPath(references, node.init.callee)
    if (
      Option.isNone(imported) ||
      !imported.value.source.startsWith('.') ||
      imported.value.localMembers.length !== 2
    ) {
      return undefined
    }
  }

  return {
    childField,
    helperLabel: `${maybeCalleePath.value.root.name}.${helperName}`,
    parentModel: maybeChildPath.value.root,
  }
}

const collectChildReturnOrigins = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ChildReturnOrigins => {
  const byVariable = new WeakMap<Variable, ChildReturnOrigin>()
  const fallbackByName = new Map<string, ChildReturnOrigin>()
  const variables = (scopes ?? []).flatMap(scope => scope.variables)

  walk(program, node => {
    if (!isVariableDeclarator(node) || !isIdentifier(node.id)) {
      return
    }

    const origin = childReturnOrigin(node, references)
    if (origin === undefined) {
      return
    }

    fallbackByName.set(node.id.name, origin)
    for (const variable of variables) {
      if (variable.defs.some(definition => definition.node === node)) {
        byVariable.set(variable, origin)
      }
    }
  })

  return { byVariable, fallbackByName }
}

const sameBinding = (
  left: ESTree.IdentifierReference,
  right: ESTree.IdentifierReference,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return left.name === right.name
  }

  const leftVariable = resolvedVariable(references, left)
  const rightVariable = resolvedVariable(references, right)
  return Option.isSome(leftVariable) && Option.isSome(rightVariable)
    ? leftVariable.value === rightVariable.value
    : left.name === right.name
}

const copiedChildReturn = (
  updater: ESTree.ArrowFunctionExpression,
  parentModel: ESTree.IdentifierReference,
  childField: string,
  origins: ChildReturnOrigins,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Readonly<{ message: string }> | undefined => {
  const returned = expressionsReturnedBy(updater)
  if (returned.length !== 1) {
    return undefined
  }

  const resultPath = staticMemberPath(returned[0])
  if (
    Option.isNone(resultPath) ||
    resultPath.value.members.length !== 1 ||
    resultPath.value.members[0] !== 'model'
  ) {
    return undefined
  }

  const { root: result } = resultPath.value
  const origin =
    references === undefined
      ? origins.fallbackByName.get(result.name)
      : Option.getOrUndefined(
          Option.flatMap(resolvedVariable(references, result), variable =>
            Option.fromNullishOr(origins.byVariable.get(variable)),
          ),
        )
  if (
    origin === undefined ||
    origin.childField !== childField ||
    !sameBinding(origin.parentModel, parentModel, references)
  ) {
    return undefined
  }

  return {
    message: discardedChildReturnMessage(
      childField,
      origin.helperLabel,
      result.name,
    ),
  }
}

type DirectChildStateUpdate = Readonly<{
  fieldName: string
  message: string
}>

const directChildModifyFieldsField = (
  node: ESTree.CallExpression,
  evidence: FoldEvidence,
  origins: ChildReturnOrigins,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): DirectChildStateUpdate | undefined => {
  if (!isModifyFieldsCall(node, references)) {
    return undefined
  }
  const [model, updates] = node.arguments
  if (!isIdentifierReference(model) || !isObjectExpression(updates)) {
    return undefined
  }
  const registrations = registrationsForModel(model, evidence, references)
  if (registrations === undefined) {
    return undefined
  }
  for (const property of updates.properties) {
    if (
      property.type !== 'Property' ||
      property.computed ||
      !isIdentifier(property.key)
    ) {
      continue
    }
    const fieldRegistrations = registrations.get(property.key.name) ?? []
    if (fieldRegistrations.length === 0) {
      continue
    }
    const owners = fieldRegistrations.flatMap(registration =>
      registration.childOwner === undefined ? [] : [registration.childOwner],
    )
    const isKeyed = fieldRegistrations.some(
      registration => registration.kind === 'Keyed',
    )
    const wrappedChildFields = new Set(
      fieldRegistrations.flatMap(registration =>
        registration.wrappedChildField === undefined
          ? []
          : [registration.wrappedChildField],
      ),
    )

    if (isArrowFunction(property.value)) {
      const copiedReturn = copiedChildReturn(
        property.value,
        model,
        property.key.name,
        origins,
        references,
      )
      if (copiedReturn !== undefined) {
        return { fieldName: property.key.name, message: copiedReturn.message }
      }
    }

    if (
      transformDirectlyUpdatesChild(
        property.value,
        owners,
        isKeyed,
        wrappedChildFields.size === 0 ? undefined : wrappedChildFields,
        references,
      )
    ) {
      return {
        fieldName: property.key.name,
        message: directBlockStateUpdateMessage(property.key.name),
      }
    }
  }
  return undefined
}

/** Flags parent-owned field transformations that directly update a child Block
 *  Model or copy a child Return's Model while discarding Commands or OutMessage. */
export const noDirectBlockStateUpdate = Rule.define({
  name: 'no-direct-block-state-update',
  meta: Rule.meta({
    type: 'suggestion',
    description: 'Keep Block state changes inside the child update.',
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
        const origins = collectChildReturnOrigins(node, scopes, references)
        const callbacks = moduleCallbacks(node)
        if (
          evidence.registrationsByParentModel.size === 0 &&
          evidence.fallbackRegistrationsByParentModel.size === 0 &&
          evidence.registrationsByStepFieldsCall.size === 0
        ) {
          return Effect.void
        }
        return Effect.forEach(
          (() => {
            const findings: Array<
              Readonly<{
                node: ESTree.CallExpression
                fieldName: string
                message: string
              }>
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
              const finding =
                directChildStepFieldsField(
                  candidate,
                  evidence,
                  callbacks,
                  references,
                ) ??
                directChildModifyFieldsField(
                  candidate,
                  evidence,
                  origins,
                  references,
                )
              if (finding !== undefined) {
                findings.push({ node: candidate, ...finding })
              }
            })
            return findings
          })(),
          ({ node: findingNode, message }) =>
            ctx.report(
              Diagnostic.make({
                node: findingNode,
                message,
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
