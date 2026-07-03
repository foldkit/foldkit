import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as Str from 'effect/String'

/**
 * Bare `input`, `textarea`, and `button` calls skip the accessibility wiring
 * that `Ui.Input`, `Ui.Textarea`, and `Ui.Button` provide (label association,
 * focus management, ARIA state, keyboard handling).
 *
 * The escape hatch is oxlint's native disable directive:
 * `// oxlint-disable-next-line @mpsuesser/foldkit/no-hand-rolled-form-controls -- <reason>`.
 *
 * @since 0.4.0
 */

const FORM_CONTROL_TAGS = HashSet.make('input', 'textarea', 'button')

const formControlName = (call: ESTree.CallExpression): Option.Option<string> =>
  call.callee.type === 'Identifier' &&
  HashSet.has(FORM_CONTROL_TAGS, call.callee.name)
    ? Option.some(call.callee.name)
    : Option.none()

/**
 * `Ui.Button({ toView: ({ attributes }) => button([...attributes.button, ...]) })`
 * is the blessed escape from a `Ui.*` component to a custom-rendered control.
 * Spreading `attributes.<tag>` into the attribute array is the marker for that
 * hand-off and must not trigger this rule.
 */
const isUiAttributesSpread = (
  el: ESTree.ArrayExpression['elements'][number],
): boolean =>
  el !== null &&
  el.type === 'SpreadElement' &&
  el.argument.type === 'MemberExpression' &&
  el.argument.object.type === 'Identifier' &&
  el.argument.object.name === 'attributes'

const looksLikeUiToViewCallback = (call: ESTree.CallExpression): boolean => {
  const arg0 = call.arguments[0]
  if (arg0 === undefined || arg0.type !== 'ArrayExpression') return false
  return pipe(arg0.elements, Arr.some(isUiAttributesSpread))
}

const messageFor = (tag: string): string =>
  tag === 'button'
    ? 'Bare `button([...])` skips accessibility wiring. Use `Ui.Button` (which exposes a `toView` callback for custom looks), or add a `// oxlint-disable-next-line @mpsuesser/foldkit/no-hand-rolled-form-controls -- <reason>` directive to opt out. (FK-5)'
    : `Bare \`${tag}([...])\` skips label association, validation hooks, and ARIA states. Use \`Ui.${Str.capitalize(tag)}.view\`, or add a \`// oxlint-disable-next-line @mpsuesser/foldkit/no-hand-rolled-form-controls -- <reason>\` directive to opt out. (FK-5)`

const rule: CreateRule = Rule.define({
  name: 'no-hand-rolled-form-controls',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Disallow bare `input`/`textarea`/`button` calls; use `Ui.*` components (FK-5)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        formControlName(node),
        Option.filter(() => !looksLikeUiToViewCallback(node)),
        Option.match({
          onNone: () => Effect.void,
          onSome: tag =>
            ctx.report(
              Diagnostic.make({
                node,
                message: messageFor(tag),
              }),
            ),
        }),
      ),
    )
  },
})

export default rule
