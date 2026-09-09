import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  helperCalleeName,
  indexReferences,
  isFoldkitHtmlBuilderMember,
  isStringLiteral,
  resolveFoldkitApiPath,
} from '../guards.ts'

// GUARDS

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression' &&
  'arguments' in node &&
  Array.isArray(node.arguments)

const isTemplateLiteral = (node: unknown): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral' &&
  'quasis' in node &&
  Array.isArray(node.quasis)

// NOTE: load and openUrl are intentionally excluded. They are full-page and
// new-tab primitives (window.location.assign, window.open) that legitimately
// take server endpoints and external URLs with no client Router to print.
const ROUTING_FUNCTION_NAMES: ReadonlyArray<string> = [
  'Href',
  'pushUrl',
  'replaceUrl',
]

const INTERNAL_NAVIGATION_FUNCTION_NAMES: ReadonlyArray<string> = [
  'pushUrl',
  'replaceUrl',
]

const INTERNAL_PATH_PATTERN = /^\//
const ABSOLUTE_URL_PATTERN = /^https?:\/\//

const routingFunctionName = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  if (references === undefined) {
    return pipe(
      helperCalleeName(callee),
      Option.filter(name => Array.contains(ROUTING_FUNCTION_NAMES, name)),
    )
  }

  if (isFoldkitHtmlBuilderMember(callee, 'Href', references)) {
    return Option.some('Href')
  }

  return Option.flatMap(resolveFoldkitApiPath(references, callee), path => {
    const [namespace, functionName, extraMember] = path

    return namespace === 'Navigation' &&
      functionName !== undefined &&
      Array.contains(INTERNAL_NAVIGATION_FUNCTION_NAMES, functionName) &&
      extraMember === undefined
      ? Option.some(functionName)
      : Option.none()
  })
}

const isHardcodedRouteString = (functionName: string, value: string): boolean =>
  INTERNAL_PATH_PATTERN.test(value) ||
  (Array.contains(INTERNAL_NAVIGATION_FUNCTION_NAMES, functionName) &&
    ABSOLUTE_URL_PATTERN.test(value))

const templateCookedHead = (
  node: ESTree.TemplateLiteral,
): Option.Option<string> =>
  pipe(
    Array.head(node.quasis),
    Option.flatMap(headQuasi => Option.fromNullishOr(headQuasi.value.cooked)),
  )

const hardcodedRouteStringMessage = (
  functionName: string,
  value: string,
): string =>
  `Hardcoded route string in \`${functionName}('${value}')\`. Routers are bidirectional; call the Router as a printer instead: \`${functionName}(homeRouter())\`, \`${functionName}(tagFilterRouter({ tag }))\`.`

const hardcodedRouteTemplateMessage = (
  functionName: string,
  cookedHead: string,
): string =>
  `Hardcoded route template in \`${functionName}(\`${cookedHead}...\`)\`. Routers are bidirectional; call the Router as a printer with named parameters instead of interpolating.`

// RULE

/**
 * Forbids hardcoded route strings and route template literals as the first
 * argument of navigation calls. Routers are bidirectional, so URLs come from
 * calling the Router as a printer.
 */
export const noHardcodedRouteStrings = Rule.define({
  name: 'no-hardcoded-route-strings',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Call Routers as printers instead of hardcoding route strings in navigation calls.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const maybeFunctionName = routingFunctionName(node.callee, references)
        if (Option.isNone(maybeFunctionName)) {
          return Effect.void
        }
        const { value: functionName } = maybeFunctionName
        const [firstArgument] = node.arguments
        if (
          isStringLiteral(firstArgument) &&
          isHardcodedRouteString(functionName, firstArgument.value)
        ) {
          return ctx.report(
            Diagnostic.make({
              node,
              message: hardcodedRouteStringMessage(
                functionName,
                firstArgument.value,
              ),
            }),
          )
        }
        if (isTemplateLiteral(firstArgument)) {
          return pipe(
            templateCookedHead(firstArgument),
            Option.filter(cookedHead =>
              isHardcodedRouteString(functionName, cookedHead),
            ),
            Option.match({
              onNone: () => Effect.void,
              onSome: cookedHead =>
                ctx.report(
                  Diagnostic.make({
                    node,
                    message: hardcodedRouteTemplateMessage(
                      functionName,
                      cookedHead,
                    ),
                  }),
                ),
            }),
          )
        }
        return Effect.void
      },
    }
  },
})
