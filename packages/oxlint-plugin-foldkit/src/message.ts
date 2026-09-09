import { Option } from 'effect'
import { type ESTree, type Reference } from 'effect-oxlint'

import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  resolveFoldkitApiPath,
  resolveImportedPath,
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

const containsImportedMessageReference = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference>,
  visited: WeakSet<object>,
): boolean => {
  if (typeof node !== 'object' || node === null || visited.has(node)) {
    return false
  }

  visited.add(node)
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
            containsImportedMessageReference(element, references, visited),
          )
        : containsImportedMessageReference(value, references, visited)),
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

    return containsImportedMessageReference(
      property.value,
      references,
      new WeakSet(),
    )
  })
}
