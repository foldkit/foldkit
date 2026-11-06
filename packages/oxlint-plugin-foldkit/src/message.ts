import { Option } from 'effect'
import { type ESTree, type Reference } from 'effect-oxlint'

import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  resolveFoldkitApiPath,
  staticPropertyName,
} from './guards.ts'

const foldkitMessageModule = 'foldkit/message'
const foldkitMessageUnionHelpers: ReadonlySet<string> = new Set([
  'defineMessageUnion',
  'defineInMessageUnion',
])

export const isFoldkitMessageUnionHelperName = (name: string): boolean =>
  foldkitMessageUnionHelpers.has(name)

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
        ((specifier.imported.type === 'Identifier' &&
          isFoldkitMessageUnionHelperName(specifier.imported.name)) ||
          (isStringLiteral(specifier.imported) &&
            isFoldkitMessageUnionHelperName(specifier.imported.value)))
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
      helperName !== undefined &&
      isFoldkitMessageUnionHelperName(helperName) &&
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
