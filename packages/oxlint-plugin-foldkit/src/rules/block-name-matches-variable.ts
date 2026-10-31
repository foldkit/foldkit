import { Array, Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  blockClassDeclarationCall,
  isBlockClassMethodCall,
  resolvedBlockDeclaration,
} from '../block-implementation.ts'
import { unwrapExpression } from '../effect-constructor.ts'
import {
  firstStringArgument,
  indexReferences,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isVariableDeclarator,
  staticMemberName,
} from '../guards.ts'

const LAYER_SUFFIX = 'Live'

const blockId = (
  classNode: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> =>
  Option.flatMap(blockClassDeclarationCall(classNode, references), call =>
    Option.map(
      Option.fromNullishOr(firstStringArgument(call)),
      name => name.value,
    ),
  )

const selfTypeName = (
  classNode: ESTree.Class,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> =>
  Option.flatMap(blockClassDeclarationCall(classNode, references), call => {
    const factoryCall = unwrapExpression(call.callee)
    if (!isCallExpression(factoryCall)) {
      return Option.none()
    }

    return Option.flatMap(
      Option.fromNullishOr(factoryCall.typeArguments),
      typeArguments =>
        Option.flatMap(Array.head(typeArguments.params), selfType =>
          selfType.type === 'TSTypeReference' &&
          selfType.typeName.type === 'Identifier'
            ? Option.some<ESTree.Node>(selfType.typeName)
            : Option.none(),
        ),
    )
  })

const isClassNode = (node: unknown): node is ESTree.Class =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ClassDeclaration' || node.type === 'ClassExpression')

const makeCallOfInitializer = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.CallExpression> => {
  const expression = unwrapExpression(node)
  if (!isCallExpression(expression)) {
    return Option.none()
  }

  if (isBlockClassMethodCall(expression, 'make', references)) {
    return Option.some(expression)
  }

  const callee = unwrapExpression(expression.callee)
  return isMemberExpression(callee) &&
    Option.contains(staticMemberName(callee), 'pipe')
    ? makeCallOfInitializer(callee.object, references)
    : Option.none()
}

const blockDeclarationOfMakeCall = (
  call: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> => {
  const callee = unwrapExpression(call.callee)
  return isMemberExpression(callee)
    ? resolvedBlockDeclaration(callee.object, references)
    : Option.none()
}

const classNameMessage = (actualName: string, id: string): string =>
  `Block class "${actualName}" must be named "${id}" to match its Block id.`

const selfTypeMessage = (actualName: string, className: string): string =>
  `Block class "${className}" passes "${actualName}" as its Self type. Write Block<${className}, ...>().`

const layerNameMessage = (actualName: string, expectedName: string): string =>
  `Block Layer identifier "${actualName}" must be "${expectedName}".`

/** Requires a Block class to carry its Block id as its name and its `make`
 *  Layer to be named `<BlockId>Live`. */
export const blockNameMatchesVariable = Rule.define({
  name: 'block-name-matches-variable',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name a Block class after its Block id and its Layer <BlockId>Live.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    const checkClass = (node: ESTree.Class) => {
      const classId = node.id
      if (classId === null || classId === undefined) {
        return Effect.void
      }

      const className = classId.name
      const maybeId = blockId(node, references)
      const nameReport =
        node.type === 'ClassDeclaration' &&
        Option.isSome(maybeId) &&
        maybeId.value !== className
          ? ctx.report(
              Diagnostic.make({
                node: classId,
                message: classNameMessage(className, maybeId.value),
              }),
            )
          : Effect.void

      const maybeSelfType = selfTypeName(node, references)
      const selfReport =
        Option.isSome(maybeSelfType) &&
        isIdentifier(maybeSelfType.value) &&
        maybeSelfType.value.name !== className
          ? ctx.report(
              Diagnostic.make({
                node: maybeSelfType.value,
                message: selfTypeMessage(maybeSelfType.value.name, className),
              }),
            )
          : Effect.void

      return Effect.andThen(nameReport, selfReport)
    }

    return {
      ClassDeclaration: (node: ESTree.Node) =>
        isClassNode(node) ? checkClass(node) : Effect.void,
      ClassExpression: (node: ESTree.Node) =>
        isClassNode(node) ? checkClass(node) : Effect.void,
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          !isIdentifier(node.id) ||
          node.init === null
        ) {
          return Effect.void
        }

        const declaredName = node.id.name
        const maybeId = Option.flatMap(
          makeCallOfInitializer(node.init, references),
          call =>
            Option.flatMap(
              blockDeclarationOfMakeCall(call, references),
              declaration => blockId(declaration, references),
            ),
        )
        if (Option.isNone(maybeId)) {
          return Effect.void
        }

        const expectedName = `${maybeId.value}${LAYER_SUFFIX}`
        return declaredName === expectedName
          ? Effect.void
          : ctx.report(
              Diagnostic.make({
                node: node.id,
                message: layerNameMessage(declaredName, expectedName),
              }),
            )
      },
    }
  },
})
