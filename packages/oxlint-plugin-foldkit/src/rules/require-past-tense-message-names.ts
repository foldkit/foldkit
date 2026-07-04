import { Array, Effect, Option, Schema, String, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const FIRST_WORD = /^[A-Z][a-z0-9]*/
const PAST_TENSE_SUFFIX = 'ed'
const MINIMUM_PAST_TENSE_WORD_LENGTH = 3
const NO_OP_TAG = 'NoOp'

const IRREGULAR_PAST_TENSE_VERBS: ReadonlyArray<string> = [
  'Began',
  'Chose',
  'Got',
  'Hid',
  'Left',
  'Ran',
  'Reset',
  'Sent',
  'Set',
]

const Options = Schema.UndefinedOr(
  Schema.Struct({
    extraVerbs: Schema.optionalKey(Schema.Array(Schema.String)),
  }),
)

type Options = typeof Options.Type

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isIdentifierNamed = (
  node: unknown,
  name: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  node.name === name

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const firstWord = (tag: string): Option.Option<string> =>
  pipe(tag, String.match(FIRST_WORD), Option.flatMap(Array.head))

const notPastTenseMessage = (tag: string): string =>
  `Message tag ${tag} does not begin with a past-tense verb. Foldkit Messages are verb-first past-tense facts: ClickedSubmit, UpdatedEmail, GotHomeMessage. If the first word is an irregular past-tense verb this rule does not know, add it to the extraVerbs option.`

/**
 * Requires every Message tag defined with m(...) to begin with a past-tense
 * verb, recognized by the -ed suffix, a small allowlist of irregular
 * past-tense verbs, or the rule's extraVerbs option.
 */
export const requirePastTenseMessageNames = Rule.define({
  name: 'require-past-tense-message-names',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Foldkit Messages as verb-first past-tense facts like ClickedSubmit or UpdatedEmail.',
  }),
  options: Options,
  create: function* (options: Options) {
    const ctx = yield* RuleContext
    const extraVerbs = options?.extraVerbs ?? []
    const isPastTenseVerb = (word: string): boolean =>
      (word.length >= MINIMUM_PAST_TENSE_WORD_LENGTH &&
        word.endsWith(PAST_TENSE_SUFFIX)) ||
      IRREGULAR_PAST_TENSE_VERBS.includes(word) ||
      extraVerbs.includes(word)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isIdentifierNamed(node.callee, 'm')) {
          return Effect.void
        }
        const [firstArgument] = node.arguments
        if (!isStringLiteral(firstArgument)) {
          return Effect.void
        }
        const tag = firstArgument.value
        if (tag === NO_OP_TAG) {
          return Effect.void
        }
        if (Option.exists(firstWord(tag), isPastTenseVerb)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: notPastTenseMessage(tag) }),
        )
      },
    }
  },
})
