import { Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  type Variable,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import { makeBlockDefinitionProvenance } from '../block-schema-provenance.ts'
import {
  blockBindingConfiguration,
  blockBindingOwner,
  blockBindingSourceCall,
  indexReferences,
  isArrowFunction,
  isCallExpression,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
} from '../guards.ts'

type References = Readonly<{
  uses: WeakMap<ESTree.Node, Reference>
  variables: ReadonlyArray<Variable>
}>

const variableFor = (
  node: ESTree.IdentifierReference,
  references: References,
) =>
  Option.orElse(resolvedVariable(references.uses, node), () =>
    Option.fromNullishOr(
      references.variables.find(variable =>
        variable.identifiers.some(identifier => identifier === node),
      ),
    ),
  )

const resolvedValue = (
  value: unknown,
  references: References,
  visited: ReadonlySet<unknown> = new Set(),
): unknown => {
  if (!isIdentifierReference(value) || visited.has(value)) {
    return value
  }

  const variable = Option.getOrUndefined(variableFor(value, references))
  for (const definition of variable?.defs ?? []) {
    if (
      definition.type === 'Variable' &&
      definition.parent?.type === 'VariableDeclaration' &&
      definition.parent.kind === 'const' &&
      definition.node.type === 'VariableDeclarator'
    ) {
      return resolvedValue(
        definition.node.init,
        references,
        new Set([...visited, value]),
      )
    }
  }
  return value
}

const propertyValue = (object: unknown, name: string) =>
  isObjectExpression(object)
    ? object.properties.find(
        property =>
          property.type === 'Property' &&
          Option.contains(staticPropertyName(property), name),
      )
    : undefined

const propertyExpression = (object: unknown, name: string): unknown => {
  const property = propertyValue(object, name)
  return property?.type === 'Property' ? property.value : undefined
}

const returnedExpression = (callback: unknown): unknown => {
  if (!isArrowFunction(callback)) {
    return undefined
  }
  if (callback.body.type !== 'BlockStatement') {
    return callback.body
  }
  const returns = callback.body.body.filter(
    statement => statement.type === 'ReturnStatement',
  )
  return returns.length === 1 ? returns.at(0)?.argument : undefined
}

const sameVariable = (
  left: unknown,
  right: unknown,
  references: References,
): boolean => {
  if (!isIdentifierReference(left) || !isIdentifierReference(right)) {
    return false
  }
  const variable = variableFor(left, references)
  return (
    Option.isSome(variable) &&
    Option.exists(
      variableFor(right, references),
      other => other === variable.value,
    )
  )
}

const usesChild = (
  value: unknown,
  child: ESTree.IdentifierReference,
  references: References,
  visited: WeakSet<object> = new WeakSet(),
): boolean => {
  if (typeof value !== 'object' || value === null || visited.has(value)) {
    return false
  }
  visited.add(value)
  if (sameVariable(value, child, references)) {
    return true
  }
  const resolved = resolvedValue(value, references)
  if (resolved !== value && usesChild(resolved, child, references, visited)) {
    return true
  }
  return Object.entries(value).some(
    ([key, nested]) =>
      key !== 'parent' &&
      (globalThis.Array.isArray(nested)
        ? nested.some(entry => usesChild(entry, child, references, visited))
        : usesChild(nested, child, references, visited)),
  )
}

const coordinatedFields = (
  config: unknown,
  references: References,
): ReadonlyArray<ESTree.ObjectProperty> => {
  const read = resolvedValue(propertyExpression(config, 'read'), references)
  const write = resolvedValue(propertyExpression(config, 'write'), references)
  if (!isArrowFunction(read) || !isArrowFunction(write)) {
    return []
  }
  const readResult = resolvedValue(returnedExpression(read), references)
  const writeResult = resolvedValue(returnedExpression(write), references)
  if (!isCallExpression(readResult) || !isCallExpression(writeResult)) {
    return []
  }
  const optionSome = resolveImportedPath(
    references.uses,
    resolvedValue(readResult.callee, references),
  )
  if (
    !Option.exists(
      optionSome,
      path =>
        (path.source === 'effect' &&
          path.members.join('.') === 'Option.some') ||
        (path.source === 'effect/Option' && path.members.join('.') === 'some'),
    )
  ) {
    return []
  }
  const childPath = Option.getOrUndefined(
    staticMemberPath(resolvedValue(readResult.arguments.at(0), references)),
  )
  if (
    childPath?.members.length !== 1 ||
    !sameVariable(childPath.root, read.params.at(0), references) ||
    !sameVariable(
      writeResult.arguments.at(0),
      write.params.at(0),
      references,
    ) ||
    !Option.exists(
      resolveFoldkitApiPath(
        references.uses,
        resolvedValue(writeResult.callee, references),
      ),
      path => path.join('.') === 'Struct.modifyFields',
    )
  ) {
    return []
  }
  const field = childPath.members.at(0)
  if (field === undefined) {
    return []
  }
  const nextChild = write.params.at(1)
  const fields = resolvedValue(writeResult.arguments.at(1), references)
  if (!isIdentifierReference(nextChild) || !isObjectExpression(fields)) {
    return []
  }
  const storedChild = resolvedValue(
    returnedExpression(
      resolvedValue(propertyExpression(fields, field), references),
    ),
    references,
  )
  if (!sameVariable(storedChild, nextChild, references)) {
    return []
  }
  return fields.properties.filter(
    (property): property is ESTree.ObjectProperty =>
      property.type === 'Property' &&
      !Option.contains(staticPropertyName(property), field) &&
      usesChild(property.value, nextChild, references),
  )
}

/** Keeps parent reactions to child transitions in the Binding OutMessage policy. */
export const noBindingWriteCoordination = Rule.define({
  name: 'no-binding-write-coordination',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep direct-field Binding writers focused on storing the child Model.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    if (scopes === undefined) {
      return {}
    }
    const references = {
      uses: indexReferences(scopes),
      variables: scopes.flatMap(scope => scope.variables),
    }
    const isDefinition = makeBlockDefinitionProvenance(
      references.uses,
      ctx.filename,
    )
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const maybeOwner = blockBindingOwner(
          node,
          references.uses,
          ctx.filename,
        )
        if (Option.isNone(maybeOwner)) {
          return Effect.void
        }

        const owner = maybeOwner.value
        const source = blockBindingSourceCall(node)
        const parent = isMemberExpression(source.callee)
          ? source.callee.object
          : owner.path.root
        if (!isDefinition(parent) && owner.isImportedHelper !== true) {
          return Effect.void
        }
        const config = resolvedValue(
          blockBindingConfiguration(node, references.uses, ctx.filename),
          references,
        )
        return Effect.forEach(
          coordinatedFields(config, references),
          property =>
            ctx.report(
              Diagnostic.make({
                node: property,
                message:
                  'This direct-field Binding writer derives another parent field from the next child Model. Keep write focused on child storage; expose the child fact as an OutMessage and handle the parent reaction in withOutMessagePolicy.',
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
