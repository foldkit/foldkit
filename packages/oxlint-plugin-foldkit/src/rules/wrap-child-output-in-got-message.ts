import { Array, Effect, Option, pipe } from 'effect'
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
  blockBindingMethod,
  blockBindingConfiguration,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
} from '../guards.ts'
import { isFoldkitMessageUnionCall } from '../message.ts'

const mapperWrapperTypes: ReadonlyArray<string> = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TypeCastExpression',
]

const commandMapperPaths: ReadonlyArray<string> = [
  'Command.mapMessage',
  'Command.mapMessages',
]

const gotMessagePattern = /^Got\w*Message$/

const dynamicCalleeLabel = '<dynamic call>'

const emptyMessageUnionBindings: ReadonlySet<string> = new Set()

const isWrapperExpression = (
  node: unknown,
): node is Readonly<{ expression: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string' &&
  mapperWrapperTypes.includes(node.type) &&
  'expression' in node

const unwrapExpression = (node: unknown): unknown =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

const isArrowFunctionExpression = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression'

const isBlockStatement = (node: unknown): node is ESTree.BlockStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'BlockStatement'

const isReturnStatement = (node: unknown): node is ESTree.ReturnStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ReturnStatement'

const resolveMemberPath = (
  node: unknown,
): Option.Option<Array.NonEmptyReadonlyArray<string>> => {
  const unwrapped = unwrapExpression(node)
  if (isIdentifier(unwrapped)) {
    return Option.some(Array.of(unwrapped.name))
  }
  if (isMemberExpression(unwrapped) && !unwrapped.computed) {
    const property = unwrapExpression(unwrapped.property)
    if (!isIdentifier(property)) {
      return Option.none()
    }
    return pipe(
      resolveMemberPath(unwrapped.object),
      Option.map(Array.append(property.name)),
    )
  }
  return Option.none()
}

const isPropertyKeyNamed = (key: unknown, name: string): boolean =>
  isIdentifier(key, name) || (isStringLiteral(key) && key.value === name)

const foldkitApiPath = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ReadonlyArray<string>> => {
  if (references === undefined) {
    return resolveMemberPath(node)
  }

  return resolveFoldkitApiPath(references, node)
}

const commandMapperArrow = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.ArrowFunctionExpression> =>
  pipe(
    foldkitApiPath(node.callee, references),
    Option.map(Array.join('.')),
    Option.filter(calleePath => commandMapperPaths.includes(calleePath)),
    Option.flatMap(() => {
      const [, mapperArgument] = node.arguments
      return isArrowFunctionExpression(mapperArgument)
        ? Option.some(mapperArgument)
        : Option.none()
    }),
  )

const subscriptionLiftMapperArrow = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.ArrowFunctionExpression> => {
  const innerCall = unwrapExpression(node.callee)
  const isBinding = Option.isSome(blockBindingMethod(node, references))
  const maybeLift = isCallExpression(innerCall)
    ? pipe(
        foldkitApiPath(innerCall.callee, references),
        Option.map(Array.join('.')),
        Option.filter(calleePath => calleePath === 'Subscription.lift'),
      )
    : Option.none()

  return pipe(
    isBinding ? Option.some('bindChild') : maybeLift,
    Option.flatMap(() => {
      const configArgument = blockBindingConfiguration(node)
      if (!isObjectExpression(configArgument)) {
        return Option.none()
      }
      return pipe(
        configArgument.properties,
        Array.findFirst(property =>
          property.type === 'Property' &&
          !property.computed &&
          isPropertyKeyNamed(property.key, 'toParentMessage')
            ? Option.some(property.value)
            : Option.none(),
        ),
      )
    }),
    Option.flatMap(mapperValue =>
      isArrowFunctionExpression(mapperValue)
        ? Option.some(mapperValue)
        : Option.none(),
    ),
  )
}

const bindingParentMessageReference = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Expression> => {
  if (Option.isNone(blockBindingMethod(node, references))) {
    return Option.none()
  }

  const configArgument = blockBindingConfiguration(node)
  if (!isObjectExpression(configArgument)) {
    return Option.none()
  }

  return pipe(
    configArgument.properties,
    Array.findFirst(property =>
      property.type === 'Property' &&
      !property.computed &&
      isPropertyKeyNamed(property.key, 'parentMessage')
        ? Option.some(property.value)
        : Option.none(),
    ),
  )
}

const singleStatement = (
  block: ESTree.BlockStatement,
): Option.Option<ESTree.Statement> => {
  const [firstStatement, secondStatement] = block.body
  return firstStatement !== undefined && secondStatement === undefined
    ? Option.some(firstStatement)
    : Option.none()
}

const analyzableMapperCall = (
  arrow: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.CallExpression> => {
  const body = unwrapExpression(arrow.body)
  if (isCallExpression(body)) {
    return Option.some(body)
  }
  if (!isBlockStatement(body)) {
    return Option.none()
  }
  return pipe(
    singleStatement(body),
    Option.flatMap(statement => {
      if (!isReturnStatement(statement)) {
        return Option.none()
      }
      const returnArgument = unwrapExpression(statement.argument)
      return isCallExpression(returnArgument)
        ? Option.some(returnArgument)
        : Option.none()
    }),
  )
}

type MapperOffense = Readonly<{
  node: ESTree.Node
  calleeLabel: string
}>

const isFoldkitMessageUnionVariable = (
  variable: Variable,
  references: WeakMap<ESTree.Node, Reference>,
): boolean =>
  variable.defs.some(
    definition =>
      definition.type === 'Variable' &&
      isVariableDeclarator(definition.node) &&
      isCallExpression(definition.node.init) &&
      isFoldkitMessageUnionCall(
        definition.node.init,
        emptyMessageUnionBindings,
        references,
      ),
  )

const nonGotMapperOffense = (
  arrow: ESTree.ArrowFunctionExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<MapperOffense> =>
  pipe(
    analyzableMapperCall(arrow),
    Option.flatMap(call => {
      const maybeCalleePath = resolveMemberPath(call.callee)
      const isGotWrapper =
        references === undefined
          ? Option.exists(maybeCalleePath, calleePath =>
              gotMessagePattern.test(Array.lastNonEmpty(calleePath)),
            )
          : Option.exists(
              resolveImportedPath(references, call.callee),
              importedPath => {
                const [constructorName] = importedPath.members.slice(-1)

                return (
                  constructorName !== undefined &&
                  gotMessagePattern.test(constructorName)
                )
              },
            ) ||
            Option.exists(staticMemberPath(call.callee), calleePath => {
              const [constructorName, extraMember] = calleePath.members

              return (
                constructorName !== undefined &&
                extraMember === undefined &&
                gotMessagePattern.test(constructorName) &&
                Option.exists(
                  resolvedVariable(references, calleePath.root),
                  variable =>
                    isFoldkitMessageUnionVariable(variable, references),
                )
              )
            })

      if (isGotWrapper) {
        return Option.none()
      }

      return Option.some({
        node: call,
        calleeLabel: Option.match(maybeCalleePath, {
          onNone: () => dynamicCalleeLabel,
          onSome: calleePath => `${Array.join(calleePath, '.')}(...)`,
        }),
      })
    }),
  )

const nonGotParentMessageOffense = (
  reference: ESTree.Expression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<MapperOffense> => {
  const maybeCalleePath = resolveMemberPath(reference)
  const isGotWrapper =
    references === undefined
      ? Option.exists(maybeCalleePath, calleePath =>
          gotMessagePattern.test(Array.lastNonEmpty(calleePath)),
        )
      : Option.exists(
          resolveImportedPath(references, reference),
          importedPath => {
            const [constructorName] = importedPath.members.slice(-1)
            return (
              constructorName !== undefined &&
              gotMessagePattern.test(constructorName)
            )
          },
        ) ||
        Option.exists(staticMemberPath(reference), calleePath => {
          const [constructorName, extraMember] = calleePath.members
          return (
            constructorName !== undefined &&
            extraMember === undefined &&
            gotMessagePattern.test(constructorName) &&
            Option.exists(
              resolvedVariable(references, calleePath.root),
              variable => isFoldkitMessageUnionVariable(variable, references),
            )
          )
        })

  if (isGotWrapper || Option.isNone(maybeCalleePath)) {
    return Option.none()
  }

  return Option.some({
    node: reference,
    calleeLabel: Array.join(maybeCalleePath.value, '.'),
  })
}

const commandMapperMessage = (calleeLabel: string): string =>
  `This Command mapper must wrap child output in a Got*Message constructor. \`${calleeLabel}\` is not a Got wrapper, so this Block level never wraps its child's Messages. Route the child Message through the parent's Got*Message wrapper.`

const subscriptionMapperMessage = (calleeLabel: string): string =>
  `The toParentMessage mapper must wrap child output in a Got*Message constructor. \`${calleeLabel}\` is not a Got wrapper. Return the parent's Got*Message wrapper so each Block level wraps exactly once.`

const parentMessageMessage = (calleeLabel: string): string =>
  `The parentMessage constructor must be a Got*Message wrapper. \`${calleeLabel}\` is not a Got wrapper. Select the parent's Got*Message constructor so each Block level wraps exactly once.`

/**
 * Requires inline Command mappers and Subscription.lift toParentMessage
 * mappers to wrap child Block output in a Got*Message constructor.
 *
 * NOTE: only inline arrow mappers are analyzed. A mapper extracted to a named
 * helper is out of scope and passes, so this catches the common inline mistake
 * rather than every possible one.
 */
export const wrapChildOutputInGotMessage = Rule.define({
  name: 'wrap-child-output-in-got-message',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Wrap child Block output in a Got*Message constructor inside Command and Subscription mappers.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopeManager = ctx.sourceCode.scopeManager
    const scopes = scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const reportOffense = (
      offense: MapperOffense,
      renderMessage: (calleeLabel: string) => string,
    ) =>
      ctx.report(
        Diagnostic.make({
          node: offense.node,
          message: renderMessage(offense.calleeLabel),
        }),
      )
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          bindingParentMessageReference(node, references),
          Option.flatMap(reference =>
            nonGotParentMessageOffense(reference, references),
          ),
          Option.match({
            onSome: offense => reportOffense(offense, parentMessageMessage),
            onNone: () =>
              pipe(
                commandMapperArrow(node, references),
                Option.flatMap(arrow => nonGotMapperOffense(arrow, references)),
                Option.match({
                  onSome: offense =>
                    reportOffense(offense, commandMapperMessage),
                  onNone: () =>
                    pipe(
                      subscriptionLiftMapperArrow(node, references),
                      Option.flatMap(arrow =>
                        nonGotMapperOffense(arrow, references),
                      ),
                      Option.match({
                        onSome: offense =>
                          reportOffense(offense, subscriptionMapperMessage),
                        onNone: () => Effect.void,
                      }),
                    ),
                }),
              ),
          }),
        )
      },
    }
  },
})
