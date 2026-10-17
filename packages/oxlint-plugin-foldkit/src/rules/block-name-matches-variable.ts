import { Effect, Option } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  firstStringArgument,
  indexReferences,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolvedVariable,
  staticMemberPath,
} from '../guards.ts'

const isBlockDefineCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Block', 'define')
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace === 'Block' &&
      methodName === 'define' &&
      extraMember === undefined
    )
  })
}

const isApplicationDefineCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return (
      AST.isCallOf(node, 'Application', 'define') ||
      isIdentifier(node.callee, 'defineApplication')
    )
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      (namespace === 'defineApplication' && methodName === undefined) ||
      (namespace === 'Application' &&
        methodName === 'define' &&
        extraMember === undefined)
    )
  })
}

type AuthoringStage = Readonly<{
  isApplication: boolean
  isComposition: boolean
  identity: string | undefined
}>

const authoringStage = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: ReadonlySet<ESTree.Node> = new Set(),
): AuthoringStage | undefined => {
  if (visited.has(node)) {
    return undefined
  }

  const isBlock = isBlockDefineCall(node, references)
  const isApplication = isApplicationDefineCall(node, references)
  if (isBlock || isApplication) {
    return {
      isApplication,
      isComposition: false,
      identity: firstStringArgument(node)?.value,
    }
  }

  if (
    !isMemberExpression(node.callee) ||
    node.callee.computed ||
    !isIdentifier(node.callee.property)
  ) {
    return undefined
  }

  const methodName = node.callee.property.name
  if (methodName !== 'define' && methodName !== 'makeComposition') {
    return undefined
  }

  const receiver = node.callee.object
  const precedingStage = (() => {
    if (isCallExpression(receiver)) {
      return authoringStage(receiver, references, new Set([...visited, node]))
    }

    if (references === undefined) {
      return undefined
    }

    const path = staticMemberPath(receiver)
    if (Option.isNone(path)) {
      return undefined
    }

    const variable = resolvedVariable(references, path.value.root)
    if (Option.isSome(variable)) {
      for (const definition of variable.value.defs) {
        if (
          definition.type === 'Variable' &&
          isVariableDeclarator(definition.node) &&
          isCallExpression(definition.node.init)
        ) {
          return authoringStage(
            definition.node.init,
            references,
            new Set([...visited, node]),
          )
        }
      }
    }

    return undefined
  })()
  if (precedingStage === undefined) {
    return undefined
  }

  return {
    ...precedingStage,
    isComposition:
      precedingStage.isComposition || methodName === 'makeComposition',
  }
}

/** Requires Block and Application bindings to follow the authoring and Composition stage naming model. */
export const blockNameMatchesVariable = Rule.define({
  name: 'block-name-matches-variable',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Block and Application bindings for their authoring stage.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (!isVariableDeclarator(node) || !isIdentifier(node.id)) {
          return Effect.void
        }

        const init = node.init
        if (!isCallExpression(init)) {
          return Effect.void
        }

        const stage = authoringStage(init, references)
        if (stage === undefined) {
          return Effect.void
        }

        if (stage.isApplication) {
          const expectedName = stage.isComposition
            ? 'ApplicationComposition'
            : 'Application'
          if (node.id.name === expectedName) {
            return Effect.void
          }

          return ctx.report(
            Diagnostic.make({
              node: node.id,
              message: `Application identifier "${node.id.name}" must be "${expectedName}" at this authoring stage.`,
            }),
          )
        }

        const identity = stage.identity
        if (identity === undefined) {
          return Effect.void
        }

        const expectedName = `${identity}${stage.isComposition ? 'Composition' : ''}`
        const isValidName = node.id.name === expectedName
        if (isValidName) {
          return Effect.void
        }

        return ctx.report(
          Diagnostic.make({
            node: node.id,
            message: `Block ${stage.isComposition ? 'Composition' : 'authoring'} identifier "${node.id.name}" must be "${expectedName}".`,
          }),
        )
      },
    }
  },
})
