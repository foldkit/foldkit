import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
} from '../guards.ts'

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

const commandMapperArrow = (
  node: ESTree.CallExpression,
): Option.Option<ESTree.ArrowFunctionExpression> =>
  pipe(
    resolveMemberPath(node.callee),
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
): Option.Option<ESTree.ArrowFunctionExpression> => {
  const innerCall = unwrapExpression(node.callee)
  if (!isCallExpression(innerCall)) {
    return Option.none()
  }
  return pipe(
    resolveMemberPath(innerCall.callee),
    Option.map(Array.join('.')),
    Option.filter(calleePath => calleePath === 'Subscription.lift'),
    Option.flatMap(() => {
      const [configArgument] = node.arguments
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
  call: ESTree.CallExpression
  calleeLabel: string
}>

const nonGotMapperOffense = (
  arrow: ESTree.ArrowFunctionExpression,
): Option.Option<MapperOffense> =>
  pipe(
    analyzableMapperCall(arrow),
    Option.flatMap(call =>
      pipe(
        resolveMemberPath(call.callee),
        Option.match({
          onNone: () => Option.some({ call, calleeLabel: dynamicCalleeLabel }),
          onSome: calleePath =>
            gotMessagePattern.test(Array.lastNonEmpty(calleePath))
              ? Option.none()
              : Option.some({
                  call,
                  calleeLabel: `${Array.join(calleePath, '.')}(...)`,
                }),
        }),
      ),
    ),
  )

const commandMapperMessage = (calleeLabel: string): string =>
  `This Command mapper must wrap child output in a Got*Message constructor. \`${calleeLabel}\` is not a Got wrapper, so this Submodel level never wraps its child's Messages. Route the child Message through the parent's Got*Message wrapper.`

const subscriptionMapperMessage = (calleeLabel: string): string =>
  `The toParentMessage mapper in Subscription.lift must wrap child output in a Got*Message constructor. \`${calleeLabel}\` is not a Got wrapper. Return the parent's Got*Message wrapper so each Submodel level wraps exactly once.`

/**
 * Requires inline Command mappers and Subscription.lift toParentMessage
 * mappers to wrap child Submodel output in a Got*Message constructor.
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
      'Wrap child Submodel output in a Got*Message constructor inside Command and Subscription mappers.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const reportOffense = (
      offense: MapperOffense,
      renderMessage: (calleeLabel: string) => string,
    ) =>
      ctx.report(
        Diagnostic.make({
          node: offense.call,
          message: renderMessage(offense.calleeLabel),
        }),
      )
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          commandMapperArrow(node),
          Option.flatMap(nonGotMapperOffense),
          Option.match({
            onSome: offense => reportOffense(offense, commandMapperMessage),
            onNone: () =>
              pipe(
                subscriptionLiftMapperArrow(node),
                Option.flatMap(nonGotMapperOffense),
                Option.match({
                  onSome: offense =>
                    reportOffense(offense, subscriptionMapperMessage),
                  onNone: () => Effect.void,
                }),
              ),
          }),
        )
      },
    }
  },
})
