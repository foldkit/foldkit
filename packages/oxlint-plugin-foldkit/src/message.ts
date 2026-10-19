import { Option } from 'effect'
import { type ESTree, type Reference } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
} from './guards.ts'

const foldkitMessageModule = 'foldkit/message'

export type MessageCase = Readonly<{
  name: string
  nameNode: ESTree.Node
  fields: ESTree.ObjectExpression
}>

export const recordFoldkitMessageUnionBindings = (
  bindings: Set<string>,
  node: ESTree.Node,
): void => {
  if (node.type !== 'Program') {
    return
  }

  for (const statement of node.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      statement.source.value !== foldkitMessageModule
    ) {
      continue
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        (isIdentifier(specifier.imported, 'defineMessageUnion') ||
          (isStringLiteral(specifier.imported) &&
            specifier.imported.value === 'defineMessageUnion'))
      ) {
        bindings.add(specifier.local.name)
      }
    }
  }
}

export const isFoldkitMessageUnionCall = (
  node: ESTree.CallExpression,
  bindings: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return isIdentifier(node.callee) && bindings.has(node.callee.name)
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, helperName, extraMember] = path

    return (
      namespace === 'Message' &&
      helperName === 'defineMessageUnion' &&
      extraMember === undefined
    )
  })
}

export const messageCases = (
  node: ESTree.CallExpression,
  bindings: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<MessageCase> => {
  if (!isFoldkitMessageUnionCall(node, bindings, references)) {
    return []
  }

  const [casesByTag] = node.arguments
  if (!isObjectExpression(casesByTag)) {
    return []
  }

  return casesByTag.properties.flatMap(property => {
    if (property.type !== 'Property') {
      return []
    }

    const maybeName = staticPropertyName(property)
    if (Option.isNone(maybeName) || !isObjectExpression(property.value)) {
      return []
    }

    return [
      {
        name: maybeName.value,
        nameNode: property.key,
        fields: property.value,
      },
    ]
  })
}

export const hasMessagePayloadProperty = (
  fields: ESTree.ObjectExpression,
): boolean =>
  fields.properties.some(
    property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')),
  )

const isLocalQueryMessageReference = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  Option.exists(staticMemberPath(node), memberPath => {
    const [memberName, extraMember] = memberPath.members
    if (memberName !== 'Message' || extraMember !== undefined) {
      return false
    }

    return Option.exists(
      resolvedVariable(references, memberPath.root),
      variable =>
        variable.defs.some(definition => {
          if (
            definition.type !== 'Variable' ||
            !isVariableDeclarator(definition.node) ||
            !isCallExpression(definition.node.init)
          ) {
            return false
          }

          return Option.exists(
            resolveFoldkitApiPath(references, definition.node.init.callee),
            apiPath => {
              const apiName = apiPath.join('.')

              return (
                apiName === 'Query.define' ||
                apiName === 'Experimental.Query.define'
              )
            },
          )
        }),
    )
  })

const containsMessageReference = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference>,
  visited: WeakSet<object>,
): boolean => {
  if (typeof node !== 'object' || node === null || visited.has(node)) {
    return false
  }

  visited.add(node)
  if (isLocalQueryMessageReference(node, references)) {
    return true
  }

  if (
    Option.exists(resolveImportedPath(references, node), path => {
      const [messageName] = path.members.slice(-1)

      return messageName === 'Message'
    })
  ) {
    return true
  }

  return Object.entries(node).some(
    ([key, value]) =>
      key !== 'parent' &&
      (Array.isArray(value)
        ? value.some(element =>
            containsMessageReference(element, references, visited),
          )
        : containsMessageReference(value, references, visited)),
  )
}

export const hasSubmodelMessagePayload = (
  fields: ESTree.ObjectExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return hasMessagePayloadProperty(fields)
  }

  return fields.properties.some(property => {
    if (
      property.type !== 'Property' ||
      !(
        isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')
      )
    ) {
      return false
    }

    return containsMessageReference(property.value, references, new WeakSet())
  })
}
