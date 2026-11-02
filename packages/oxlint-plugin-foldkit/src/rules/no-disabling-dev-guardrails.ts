import { Effect, Option, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isCallExpression,
  resolveFoldkitApiPath,
} from '../guards.ts'

const SLOW_MESSAGE =
  "`slow: false` turns off Foldkit's dev performance warnings, which flag update, view, and patch phases that blow their budgets. Tune instead of disabling: pass an object with thresholdOverrides, measuredPhases, show, or onSlow. A deliberate disable belongs behind an oxlint-disable comment at this line."

const isFactoryCallee = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const { callee } = node

  if (references !== undefined) {
    return Option.exists(resolveFoldkitApiPath(references, callee), path => {
      const [namespace, factoryName, extraMember] = path

      return (
        namespace === 'Program' &&
        (factoryName === 'make' || factoryName === 'makeElement') &&
        extraMember === undefined
      )
    })
  }

  return (
    AST.isCallOf(node, 'Program', 'make') ||
    AST.isCallOf(node, 'Program', 'makeElement')
  )
}

const staticKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.key.type === 'Identifier') {
    return Option.some(property.key.name)
  }
  if (
    property.key.type === 'Literal' &&
    typeof property.key.value === 'string'
  ) {
    return Option.some(property.key.value)
  }
  return Option.none()
}

const isFalseLiteral = (value: ESTree.Expression): boolean =>
  value.type === 'Literal' && value.value === false

const guardrailMessageForKey = (keyName: string): Option.Option<string> =>
  keyName === 'slow' ? Option.some(SLOW_MESSAGE) : Option.none()

const disabledGuardrailMessage = (
  property: ESTree.ObjectPropertyKind,
): Option.Option<string> => {
  if (property.type !== 'Property') return Option.none()
  if (property.kind === 'get' || property.kind === 'set') return Option.none()
  if (property.computed) return Option.none()
  if (!isFalseLiteral(property.value)) return Option.none()
  return pipe(staticKeyName(property), Option.flatMap(guardrailMessageForKey))
}

/** Flags `slow: false` in the options object passed directly to `Program.make` or `Program.makeElement`. Disabling a dev guardrail hides the problem it would have surfaced; a deliberate disable belongs behind an oxlint-disable comment. */
export const noDisablingDevGuardrails = Rule.define({
  name: 'no-disabling-dev-guardrails',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep the slow dev guardrail enabled in Foldkit Program options.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isFactoryCallee(node, references)) {
          return Effect.void
        }
        const disabledGuardrails = node.arguments.flatMap(argument => {
          if (argument.type !== 'ObjectExpression') return []
          return argument.properties.flatMap(property =>
            Option.match(disabledGuardrailMessage(property), {
              onNone: () => [],
              onSome: message => [{ property, message }],
            }),
          )
        })
        return Effect.forEach(
          disabledGuardrails,
          ({ property, message }) =>
            ctx.report(Diagnostic.make({ node: property, message })),
          { discard: true },
        )
      },
    }
  },
})
