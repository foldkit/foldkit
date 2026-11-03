import { Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
  Visitor,
} from 'effect-oxlint'

import {
  makeCompletedBlockProvenance,
  unwrapSchemaExpression,
} from '../block-schema-provenance.ts'
import {
  indexReferences,
  isArrayExpression,
  isCallExpression,
  isIdentifierReference,
  isMemberExpression,
  isObjectExpression,
  isProgram,
  isVariableDeclarator,
  resolveImportedPath,
  resolvedVariable,
  staticMemberName,
} from '../guards.ts'

const isSyntaxNode = (node: unknown): node is ESTree.Node =>
  typeof node === 'object' && node !== null && 'type' in node

const nodeChildren = (node: ESTree.Node): ReadonlyArray<ESTree.Node> =>
  Object.entries(node).flatMap(([key, value]) => {
    if (key === 'parent' || key === 'typeAnnotation') {
      return []
    }
    const values = globalThis.Array.isArray(value) ? value : [value]
    return values.filter(isSyntaxNode)
  })

const immutableInitializer = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Readonly<{ variable: Variable; init: unknown }> | undefined => {
  if (!isIdentifierReference(node)) {
    return undefined
  }
  const variable = resolvedVariable(references, node)
  if (Option.isNone(variable)) {
    return undefined
  }
  for (const definition of variable.value.defs) {
    if (
      definition.type === 'Variable' &&
      definition.parent?.type === 'VariableDeclaration' &&
      definition.parent.kind === 'const' &&
      isVariableDeclarator(definition.node)
    ) {
      return { variable: variable.value, init: definition.node.init }
    }
  }
  return undefined
}

const schemaPath = (
  references: WeakMap<ESTree.Node, Reference>,
  input: unknown,
  visited: ReadonlySet<Variable> = new Set(),
): ReadonlyArray<string> | undefined => {
  const node = unwrapSchemaExpression(input)
  const imported = resolveImportedPath(references, node)
  if (Option.isSome(imported)) {
    const { source, members } = imported.value
    if (source === 'effect/Schema') {
      return members
    }
    const [namespace, ...path] = members
    return source === 'effect' && namespace === 'Schema' ? path : undefined
  }
  const initializer = immutableInitializer(references, node)
  if (initializer !== undefined && !visited.has(initializer.variable)) {
    return schemaPath(
      references,
      initializer.init,
      new Set([...visited, initializer.variable]),
    )
  }
  if (isMemberExpression(node)) {
    const parentPath = schemaPath(references, node.object, visited)
    const name = Option.getOrUndefined(staticMemberName(node))
    if (parentPath !== undefined && name !== undefined) {
      return [...parentPath, name]
    }
  }
  return undefined
}

const schemaConstructors = new Set([
  'Struct',
  'Array',
  'NonEmptyArray',
  'Option',
  'Union',
  'Record',
  'Tuple',
  'TupleWithRest',
  'NullOr',
  'UndefinedOr',
  'NullishOr',
  'optional',
  'optionalKey',
  'mutable',
])

const isSchemaConstructor = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): boolean => {
  const path = schemaPath(references, node)
  if (path === undefined) {
    return false
  }
  const [name, extra] = path
  return (
    name !== undefined && extra === undefined && schemaConstructors.has(name)
  )
}

/** Keeps parent Schema construction independent of inferred completed Block implementations. */
export const noCompletedBlockModelInSchema = Rule.define({
  name: 'no-completed-block-model-in-schema',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep parent Schema construction independent of inferred completed Block implementations.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    if (scopes === undefined) {
      return {}
    }
    const references = indexReferences(scopes)
    const isCompletedBlock = makeCompletedBlockProvenance(
      references,
      ctx.filename,
    )

    return Visitor.onExit('Program', (program: ESTree.Node) => {
      if (!isProgram(program)) {
        return Effect.void
      }
      const reported = new Set<ESTree.Node>()
      const inspectSchemaInput = (
        input: unknown,
        visited: ReadonlySet<Variable> = new Set(),
      ): void => {
        const node = unwrapSchemaExpression(input)
        if (isMemberExpression(node)) {
          if (
            Option.contains(staticMemberName(node), 'Model') &&
            isCompletedBlock(node.object)
          ) {
            reported.add(node)
          }
          return
        }
        const initializer = immutableInitializer(references, node)
        if (initializer !== undefined && !visited.has(initializer.variable)) {
          inspectSchemaInput(
            initializer.init,
            new Set([...visited, initializer.variable]),
          )
        } else if (isObjectExpression(node)) {
          for (const property of node.properties) {
            if (property.type === 'Property') {
              inspectSchemaInput(property.value, visited)
            } else if (property.type === 'SpreadElement') {
              inspectSchemaInput(property.argument, visited)
            }
          }
        } else if (isArrayExpression(node)) {
          for (const element of node.elements) {
            inspectSchemaInput(element, visited)
          }
        } else if (
          isCallExpression(node) &&
          isSchemaConstructor(references, node.callee)
        ) {
          for (const argument of node.arguments) {
            inspectSchemaInput(argument, visited)
          }
        }
      }
      const visit = (node: ESTree.Node): void => {
        if (node.type.startsWith('TS')) {
          const expression = unwrapSchemaExpression(node)
          if (expression !== node && isSyntaxNode(expression)) {
            visit(expression)
          }
          return
        }
        if (
          isCallExpression(node) &&
          isSchemaConstructor(references, node.callee)
        ) {
          for (const argument of node.arguments) {
            inspectSchemaInput(argument)
          }
        }
        for (const child of nodeChildren(node)) {
          visit(child)
        }
      }
      visit(program)

      return Effect.forEach(
        reported,
        node =>
          ctx.report(
            Diagnostic.make({
              node,
              message:
                'Using an inferred native completed Block’s `Model` in Schema construction can force expensive inference of its implementation graph. Compose the independent `Definition.contract.Model`, or import the child’s canonical Model Schema from its public module. Completed Block `.Model` remains available for ordinary access and type annotations.',
            }),
          ),
        { discard: true },
      )
    })
  },
})
