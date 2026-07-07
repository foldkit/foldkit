import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  isVariableDeclarator,
} from '../guards.ts'

const isTSAsExpression = (
  node: ESTree.Node,
): node is ESTree.Node & { readonly expression: ESTree.Node } =>
  node.type === 'TSAsExpression' &&
  'expression' in node &&
  typeof node.expression === 'object' &&
  node.expression !== null

const typeNameEndsWithMessage = (node: unknown): boolean => {
  if (isIdentifier(node)) return node.name === 'Message'
  if (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    node.type === 'TSQualifiedName' &&
    'right' in node
  ) {
    return typeNameEndsWithMessage(node.right)
  }
  return false
}

const hasMessageTypeAnnotation = (node: ESTree.VariableDeclarator): boolean => {
  const id = node.id as unknown
  if (
    typeof id !== 'object' ||
    id === null ||
    !('typeAnnotation' in id) ||
    typeof id.typeAnnotation !== 'object' ||
    id.typeAnnotation === null ||
    !('typeAnnotation' in id.typeAnnotation)
  ) {
    return false
  }

  const typeAnnotation = id.typeAnnotation.typeAnnotation
  if (
    typeof typeAnnotation !== 'object' ||
    typeAnnotation === null ||
    !('type' in typeAnnotation) ||
    typeAnnotation.type !== 'TSTypeReference' ||
    !('typeName' in typeAnnotation)
  ) {
    return false
  }

  return typeNameEndsWithMessage(typeAnnotation.typeName)
}

const hasTagPropertyWithStringLiteral = (
  node: ESTree.ObjectExpression,
): boolean =>
  node.properties.some(property => {
    if (property.type !== 'Property') return false
    const isTagKey =
      isIdentifier(property.key, '_tag') ||
      (isStringLiteral(property.key) && property.key.value === '_tag')
    return isTagKey && isStringLiteral(property.value)
  })

/**
 * Flags object literals typed or cast as a Message with a _tag, steering toward
 * the callable Schema constructor.
 */
export const preferCallableMessageConstructor = Rule.define({
  name: 'prefer-callable-message-constructor',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Construct Messages via their callable Schema constructor instead of typing or casting an object literal.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          !hasMessageTypeAnnotation(node) ||
          !isObjectExpression(node.init) ||
          !hasTagPropertyWithStringLiteral(node.init)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message:
              'Construct Messages with their callable Schema constructor (e.g. Foo({ ... })) instead of typing an object literal with a _tag.',
          }),
        )
      },
      TSAsExpression: (node: ESTree.Node) => {
        if (
          !isTSAsExpression(node) ||
          !isObjectExpression(node.expression) ||
          !hasTagPropertyWithStringLiteral(node.expression)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message:
              'Construct Messages with their callable Schema constructor (e.g. Foo({ ... })) instead of casting an object literal with a _tag.',
          }),
        )
      },
    }
  },
})
