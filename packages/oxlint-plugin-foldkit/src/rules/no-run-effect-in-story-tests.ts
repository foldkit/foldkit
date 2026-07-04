import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

// Running the Command Effect directly instead of resolving it through the DSL.
const EFFECT_RUNNERS: ReadonlyArray<string> = [
  'runSync',
  'runSyncExit',
  'runPromise',
  'runPromiseExit',
  'runFork',
]

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (node: unknown): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

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

// True for `Effect.runSync(...)`, `Effect.runPromise(...)`, and friends.
const isEffectRunnerCall = (node: ESTree.CallExpression): boolean => {
  const callee = node.callee
  return (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifierNamed(callee.object, 'Effect') &&
    typeof callee.property === 'object' &&
    callee.property !== null &&
    'type' in callee.property &&
    callee.property.type === 'Identifier' &&
    'name' in callee.property &&
    typeof callee.property.name === 'string' &&
    EFFECT_RUNNERS.includes(callee.property.name)
  )
}

const isTestFile = (filename: string): boolean => filename.includes('.test.')

const RUN_EFFECT_IN_STORY_MESSAGE =
  'Do not run a Command Effect with Effect.runSync/runPromise in a Story/Scene test. Resolve the pending Command through the DSL with Story.Command.resolve(Def, msg) (or Scene.Command.resolve) so the test drives the Command exactly as the runtime does.'

/**
 * Forbids running Command Effects directly with Effect.runSync/runPromise in
 * Story/Scene test files. Pending Commands must be resolved through the DSL
 * (Story.Command.resolve / Scene.Command.resolve), which drives them the way
 * the runtime does instead of side-stepping it.
 */
export const noRunEffectInStoryTests = Rule.define({
  name: 'no-run-effect-in-story-tests',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Resolve pending Commands with Story.Command.resolve in test files instead of running the Effect directly.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isTestFile(ctx.filename) ||
          !isCallExpression(node) ||
          !isEffectRunnerCall(node)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: RUN_EFFECT_IN_STORY_MESSAGE,
          }),
        )
      },
    }
  },
})
