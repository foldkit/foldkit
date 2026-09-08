import { Array, Effect, Option, pipe } from 'effect'
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

const FACTORY_NAMES = ['makeApplication', 'makeElement']

const FREEZE_MODEL_MESSAGE =
  "`freezeModel: false` turns off Foldkit's dev mutation guard. When on, the runtime deep-freezes the Model after init and after every update, so an accidental mutation throws at the exact write site during development and costs nothing in production. Fix the mutation instead of disabling the guard. A deliberate disable belongs behind an oxlint-disable comment at this line."

const SLOW_MESSAGE =
  "`slow: false` turns off Foldkit's dev performance warnings, which flag update, view, and patch phases that blow their budgets. Tune instead of disabling: pass an object with thresholdOverrides, measuredPhases, show, or onSlow. A deliberate disable belongs behind an oxlint-disable comment at this line."

const isFactoryCallee = (
  callee: ESTree.Expression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references !== undefined) {
    return Option.exists(resolveFoldkitApiPath(references, callee), path => {
      const [namespace, factoryName, extraMember] = path

      return (
        namespace === 'Runtime' &&
        factoryName !== undefined &&
        FACTORY_NAMES.includes(factoryName) &&
        extraMember === undefined
      )
    })
  }

  if (callee.type === 'Identifier') {
    return FACTORY_NAMES.includes(callee.name)
  }
  if (callee.type === 'MemberExpression') {
    return Option.match(AST.memberPath(callee), {
      onNone: () => false,
      onSome: path => FACTORY_NAMES.includes(Array.lastNonEmpty(path)),
    })
  }
  return false
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

const guardrailMessageForKey = (keyName: string): Option.Option<string> => {
  if (keyName === 'freezeModel') return Option.some(FREEZE_MODEL_MESSAGE)
  if (keyName === 'slow') return Option.some(SLOW_MESSAGE)
  return Option.none()
}

const disabledGuardrailMessage = (
  property: ESTree.ObjectPropertyKind,
): Option.Option<string> => {
  if (property.type !== 'Property') return Option.none()
  if (property.kind === 'get' || property.kind === 'set') return Option.none()
  if (property.computed) return Option.none()
  if (!isFalseLiteral(property.value)) return Option.none()
  return pipe(staticKeyName(property), Option.flatMap(guardrailMessageForKey))
}

/** Flags `freezeModel: false` and `slow: false` in config objects passed directly to `makeApplication` or `makeElement`. Disabling a dev guardrail hides the problem it would have surfaced; a deliberate disable belongs behind an oxlint-disable comment. */
export const noDisablingDevGuardrails = Rule.define({
  name: 'no-disabling-dev-guardrails',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep the freezeModel and slow dev guardrails enabled in Foldkit app configs.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isFactoryCallee(node.callee, references)
        ) {
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
