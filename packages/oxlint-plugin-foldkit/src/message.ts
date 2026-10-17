import { Array, Option } from 'effect'
import { type ESTree, type Reference, type Variable } from 'effect-oxlint'

import {
  blockBindingMethod,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isOwnedDefinitionCall,
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

const enclosingBlockArgument = (
  node: ESTree.Node,
): Option.Option<ESTree.CallExpression> => {
  const parent = node.parent
  if (parent === null) {
    return Option.none()
  }

  if (isMemberExpression(parent) && parent.object === node) {
    return enclosingBlockArgument(parent)
  }

  return isCallExpression(parent) &&
    Option.contains(Array.head(parent.arguments), node)
    ? Option.some(parent)
    : Option.none()
}

const isFoldkitUiFactoryCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  Option.exists(resolveImportedPath(references, node.callee), path => {
    return (
      Option.contains(Array.last(path.members), 'create') &&
      (path.source === '@foldkit/ui' || path.source.startsWith('@foldkit/ui/'))
    )
  })

const hasBlockBindingUse = (
  variable: Variable,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  variable.references.some(reference =>
    Option.exists(enclosingBlockArgument(reference.identifier), call =>
      Option.isSome(blockBindingMethod(call, references)),
    ),
  )

const isCompletedBlockVariable = (
  variable: Variable,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  variable.defs.some(definition => {
    if (
      definition.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isCallExpression(definition.node.init)
    ) {
      return false
    }

    return (
      isFoldkitUiFactoryCall(definition.node.init, references) ||
      isOwnedDefinitionCall(definition.node.init, 'makeBlock', references) ||
      hasBlockBindingUse(variable, references)
    )
  })

const isLocalCompletedBlockMessageReference = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  Option.exists(staticMemberPath(node), memberPath => {
    const isMessagePath = Array.match(memberPath.members, {
      onEmpty: () => false,
      onNonEmpty: ([first, ...rest]) =>
        (first === 'Message' && Array.isArrayEmpty(rest)) ||
        (first === 'block' &&
          Array.match(rest, {
            onEmpty: () => false,
            onNonEmpty: ([second, ...remaining]) =>
              second === 'Message' && Array.isArrayEmpty(remaining),
          })),
    })
    if (!isMessagePath) {
      return false
    }

    return Option.exists(
      resolvedVariable(references, memberPath.root),
      variable => isCompletedBlockVariable(variable, references),
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
  if (
    isLocalQueryMessageReference(node, references) ||
    isLocalCompletedBlockMessageReference(node, references)
  ) {
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

export const hasBlockMessagePayload = (
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
