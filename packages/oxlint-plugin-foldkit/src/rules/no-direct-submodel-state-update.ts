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
  resolvedVariable,
  staticMemberPath,
} from '../guards.ts'

const directSubmodelStateUpdateMessage = (fieldName: string): string =>
  `Do not update the Submodel field \`${fieldName}\` directly from its parent. Expose a child-owned update capability, then apply it with Update.foldChild or Update.foldChildStep.`

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
): string | undefined => {
  const [modelParameter, nextChildParameter] = callback.params
  if (!isIdentifier(modelParameter) || !isIdentifier(nextChildParameter)) {
    return undefined
  }
  const returned = expressionReturnedBy(callback)
  if (!isCallExpression(returned) || !isEvoCall(returned, references)) {
    return undefined
  }
  const [evolvedModel, updates] = returned.arguments
  if (
    !isIdentifier(evolvedModel, modelParameter.name) ||
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

const isEvoCall = (
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
          helperName === 'evo' &&
          extraMember === undefined
        )
      }) || isIdentifier(node.callee, 'evo')
    )
  }
  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'Struct' &&
      helperName === 'evo' &&
      extraMember === undefined
    )
  })
}

const isFoldChildCall = (
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
        (helperName === 'foldChild' || helperName === 'foldChildStep') &&
        extraMember === undefined
      )
    })
  }
  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    return (
      namespace === 'Update' &&
      (helperName === 'foldChild' || helperName === 'foldChildStep') &&
      extraMember === undefined
    )
  })
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
}>

type CombineStepDefinition = Readonly<{
  childFields: ReadonlySet<string>
}>

type FoldEvidence = Readonly<{
  childFieldsByParentModel: ReadonlyMap<Variable, ReadonlySet<string>>
  fallbackChildFieldsByParentModel: ReadonlyMap<string, ReadonlySet<string>>
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
      if (!isFoldChildCall(declarator.init, references)) {
        continue
      }

      const [configuration] = declarator.init.arguments
      if (!isObjectExpression(configuration)) {
        continue
      }
      const read = callbackValue(
        propertyValue(configuration, 'read'),
        callbacks,
      )
      const write = callbackValue(
        propertyValue(configuration, 'write'),
        callbacks,
      )
      if (read === undefined || write === undefined) {
        continue
      }

      writeCallbacks.add(write)
      const readField = directReadField(read)
      const writeField = directWriteField(write, references)
      if (readField === undefined || readField !== writeField) {
        continue
      }

      const definition = { childField: readField }
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

const foldDefinitionFor = (
  callee: unknown,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): FoldDefinition | undefined => {
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

const isArrayExpression = (value: unknown): value is ESTree.ArrayExpression =>
  isNode(value) && value.type === 'ArrayExpression'

const childFieldsForCombine = (
  node: ESTree.CallExpression,
  definitions: Readonly<{
    byVariable: WeakMap<Variable, FoldDefinition>
    fallbackByName: ReadonlyMap<string, FoldDefinition>
  }>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlySet<string> => {
  if (!isCombineCall(node, references)) {
    return new Set()
  }
  const [firstArgument, secondArgument] = node.arguments
  const steps = isArrayExpression(firstArgument)
    ? firstArgument
    : isArrayExpression(secondArgument)
      ? secondArgument
      : undefined
  if (steps === undefined) {
    return new Set()
  }

  const childFields = new Set<string>()
  for (const step of steps.elements) {
    if (!isCallExpression(step)) {
      continue
    }
    const definition = foldDefinitionFor(step.callee, definitions, references)
    if (definition !== undefined) {
      childFields.add(definition.childField)
    }
  }
  return childFields
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
      !isCallExpression(node.init)
    ) {
      return
    }
    const childFields = childFieldsForCombine(
      node.init,
      definitions,
      references,
    )
    if (childFields.size === 0) {
      return
    }

    const definition = { childFields }
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

const combineParentModel = (
  ancestors: ReadonlyArray<ESTree.Node>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ESTree.IdentifierReference | undefined => {
  for (const ancestor of globalThis.Array.from(ancestors).reverse()) {
    if (!isCallExpression(ancestor) || !isCombineCall(ancestor, references)) {
      continue
    }
    const [parentModel] = ancestor.arguments
    if (isIdentifierReference(parentModel)) {
      return parentModel
    }
    const invocation = ancestors.find(
      candidate => isCallExpression(candidate) && candidate.callee === ancestor,
    )
    if (invocation === undefined || !isCallExpression(invocation)) {
      continue
    }
    const [dataLastParentModel] = invocation.arguments
    if (isIdentifierReference(dataLastParentModel)) {
      return dataLastParentModel
    }
  }
  return undefined
}

const foldEvidence = (
  program: ESTree.Program,
  scopes: ReadonlyArray<OxlintScope> | undefined,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): FoldEvidence => {
  const definitions = foldDefinitions(program, scopes, references)
  const stepDefinitions = combineStepDefinitions(
    program,
    scopes,
    definitions,
    references,
  )
  const childFieldsByParentModel = new Map<Variable, Set<string>>()
  const fallbackChildFieldsByParentModel = new Map<string, Set<string>>()

  walk(program, (node, ancestors) => {
    if (!isCallExpression(node) || isDataLastFoldCall(node, ancestors)) {
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
      for (const childField of stepDefinition.childFields) {
        if (references === undefined) {
          addChildField(
            fallbackChildFieldsByParentModel,
            parentModel.name,
            childField,
          )
          continue
        }
        Option.map(resolvedVariable(references, parentModel), variable =>
          addChildField(childFieldsByParentModel, variable, childField),
        )
      }
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
    const definition = directDefinition ?? dataLastDefinition
    if (definition === undefined) {
      return
    }

    const [parentModelFromCall, message] = node.arguments
    const parentModelFromCombine =
      directDefinition !== undefined && message !== undefined
        ? undefined
        : combineParentModel(ancestors, references)
    const parentModel = parentModelFromCombine ?? parentModelFromCall
    if (
      !isIdentifierReference(parentModel) ||
      (parentModelFromCombine === undefined &&
        directDefinition !== undefined &&
        message === undefined)
    ) {
      return
    }

    if (references === undefined) {
      addChildField(
        fallbackChildFieldsByParentModel,
        parentModel.name,
        definition.childField,
      )
      return
    }

    Option.map(resolvedVariable(references, parentModel), variable =>
      addChildField(childFieldsByParentModel, variable, definition.childField),
    )
  })
  return {
    childFieldsByParentModel,
    fallbackChildFieldsByParentModel,
    writeCallbacks: definitions.writeCallbacks,
  }
}

const directChildEvoField = (
  node: ESTree.CallExpression,
  evidence: FoldEvidence,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): string | undefined => {
  if (!isEvoCall(node, references)) {
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
  for (const property of updates.properties) {
    if (
      property.type !== 'Property' ||
      property.computed ||
      !isIdentifier(property.key) ||
      !childFields.has(property.key.name) ||
      !isArrowFunction(property.value)
    ) {
      continue
    }
    const [childModel] = property.value.params
    const nestedUpdate = expressionReturnedBy(property.value)
    if (
      isIdentifier(childModel) &&
      isCallExpression(nestedUpdate) &&
      isEvoCall(nestedUpdate, references)
    ) {
      const [nestedModel] = nestedUpdate.arguments
      if (isIdentifier(nestedModel, childModel.name)) {
        return property.key.name
      }
    }
  }
  return undefined
}

/** Flags parent-owned evo calls that directly update a child Submodel Model. */
export const noDirectSubmodelStateUpdate = Rule.define({
  name: 'no-direct-submodel-state-update',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep Submodel state changes inside child-owned update capabilities.',
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
              const fieldName = directChildEvoField(
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
                message: directSubmodelStateUpdateMessage(fieldName),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
