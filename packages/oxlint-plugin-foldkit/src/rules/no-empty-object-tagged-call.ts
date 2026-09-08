import { Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
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
  isStringLiteral,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolvedVariable,
} from '../guards.ts'

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/

const UNION_HELPERS_BY_MODULE: Readonly<Record<string, string>> = {
  'foldkit/message': 'defineMessageUnion',
  'foldkit/route': 'defineRouteUnion',
  'foldkit/schema': 'defineTaggedUnion',
}

const recordUnionHelperBindings = (
  bindings: Set<string>,
  node: ESTree.Node,
): void => {
  if (node.type !== 'Program') {
    return
  }

  for (const statement of node.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type'
    ) {
      continue
    }

    const helperName = UNION_HELPERS_BY_MODULE[statement.source.value]
    if (helperName === undefined) {
      continue
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        (isIdentifier(specifier.imported, helperName) ||
          (isStringLiteral(specifier.imported) &&
            specifier.imported.value === helperName))
      ) {
        bindings.add(specifier.local.name)
      }
    }
  }
}

const isConventionalUnionNamespace = (name: string): boolean =>
  PASCAL_CASE.test(name) && /(?:Message|Route|State)$/.test(name)

const isUnionHelperCall = (
  node: ESTree.CallExpression,
  bindings: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return isIdentifier(node.callee) && bindings.has(node.callee.name)
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path
    const expectedHelperByNamespace: Readonly<Record<string, string>> = {
      Message: 'defineMessageUnion',
      Route: 'defineRouteUnion',
      Schema: 'defineTaggedUnion',
    }

    return (
      namespace !== undefined &&
      expectedHelperByNamespace[namespace] === helperName &&
      extraMember === undefined
    )
  })
}

const constructorName = (
  callee: unknown,
  unionNamespaceNames: ReadonlySet<string>,
  unionNamespaceVariables: ReadonlySet<Variable>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): string | undefined => {
  if (isIdentifier(callee) && PASCAL_CASE.test(callee.name)) {
    return callee.name
  }
  if (
    isMemberExpression(callee) &&
    callee.computed !== true &&
    isIdentifierReference(callee.object) &&
    isIdentifier(callee.property) &&
    PASCAL_CASE.test(callee.property.name)
  ) {
    const namespace = callee.object
    const isUnionNamespace =
      references === undefined
        ? unionNamespaceNames.has(namespace.name) ||
          isConventionalUnionNamespace(namespace.name)
        : Option.exists(resolvedVariable(references, namespace), variable => {
            return (
              unionNamespaceVariables.has(variable) ||
              (isConventionalUnionNamespace(namespace.name) &&
                variable.defs.some(
                  definition => definition.type === 'ImportBinding',
                ))
            )
          })

    return isUnionNamespace
      ? `${namespace.name}.${callee.property.name}`
      : undefined
  }
  return undefined
}

/** Reports no-field variant constructors called with an empty object. */
export const noEmptyObjectTaggedCall = Rule.define({
  name: 'no-empty-object-tagged-call',
  meta: Rule.meta({
    type: 'suggestion',
    description: 'Call no-field variant constructors with no arguments.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const unionHelperBindings = new Set<string>()
    const unionNamespaceNames = new Set<string>()
    const unionNamespaceVariables = new Set<Variable>()

    return {
      Program: (node: ESTree.Node) => {
        recordUnionHelperBindings(unionHelperBindings, node)
        return Effect.void
      },
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          isVariableDeclarator(node) &&
          node.id.type === 'Identifier' &&
          isCallExpression(node.init) &&
          isUnionHelperCall(node.init, unionHelperBindings, references)
        ) {
          const unionName = node.id.name
          unionNamespaceNames.add(unionName)
          const unionVariable = ctx.sourceCode.scopeManager
            ?.getDeclaredVariables(node)
            .find(variable => variable.name === unionName)
          if (unionVariable !== undefined) {
            unionNamespaceVariables.add(unionVariable)
          }
        }

        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const name = constructorName(
          node.callee,
          unionNamespaceNames,
          unionNamespaceVariables,
          references,
        )
        if (name === undefined || node.arguments.length !== 1) {
          return Effect.void
        }
        const [argument] = node.arguments
        if (!isObjectExpression(argument) || argument.properties.length > 0) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: `Call ${name}() with no arguments. ${name}({}) passes an unnecessary empty object.`,
          }),
        )
      },
    }
  },
})
