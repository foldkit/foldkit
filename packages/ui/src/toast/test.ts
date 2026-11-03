import { Array, Result, Schema } from 'effect'
import type { Effect } from 'effect'
import type * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'
import { __bindCommandMatcher } from 'foldkit/test'

import {
  AnimationBlock,
  WaitForAnimationSettled,
  WaitForPaint,
} from '../animation/block.js'
import { Message as AnimationMessage } from '../animation/schema.js'
import { Message as ToastMessage } from './schema.js'

const WaitBeforeDismissalArgs = Schema.Struct({
  entryId: Schema.String,
  version: Schema.Number,
  duration: Schema.DurationFromMillis,
})
type WaitBeforeDismissalArgs = typeof WaitBeforeDismissalArgs.Type

type CommandInstance<ResultMessage> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<ResultMessage, unknown, unknown>
}>

type BindingFor<BlockValue extends Block.DescriptorContract> =
  Block.AnyBinding &
    Block.BindingEvidence<
      Block.CoreContract<BlockValue>,
      unknown,
      unknown,
      boolean
    >

type BindingOccurrence<BindingValue> =
  BindingValue extends Block.BindingEvidence<unknown, unknown, unknown, true> &
    Readonly<{ fold: (...args: infer Args) => unknown }>
    ? Args extends readonly [unknown, infer Key, ...ReadonlyArray<unknown>]
      ? Readonly<{ key: Key & (string | number) }>
      : never
    : Readonly<{ key?: never }>

/** Input for a completed Toast Block's `test.drainEntry` helper. `binding`
 * selects the exact placement of that completed Block. A keyed Binding also
 * requires an occurrence `key` of that Binding's key type. `entryId` selects a
 * freshly shown entry, and `version` defaults to its initial timer version
 * `0`. */
export type DrainEntryInput<
  BlockValue extends Block.DescriptorContract,
  BindingValue extends BindingFor<NoInfer<BlockValue>>,
> = Readonly<{
  binding: BindingValue
  entryId: string
  version?: number
}> &
  BindingOccurrence<BindingValue>

/** Completed Toast Block Story helper for one exact Binding occurrence. */
export type DrainEntry<BlockValue extends Block.DescriptorContract> = <
  const BindingValue extends BindingFor<NoInfer<BlockValue>>,
>(
  input: DrainEntryInput<BlockValue, BindingValue>,
) => <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
) => Story.StorySimulation<Model, Message, OutMessage>

/** Test helpers attached to one completed Toast Block. */
export type ToastTest<BlockValue extends Block.DescriptorContract> = Readonly<{
  drainEntry: DrainEntry<BlockValue>
}>

type FixtureTest<BlockValue extends Block.DescriptorContract> =
  ToastTest<BlockValue> &
    Readonly<{
      matchWaitForPaint: (
        entryId: string,
        generation: number,
      ) => CommandInstance<typeof AnimationMessage.CompletedWaitForPaint.Type>
      matchWaitForAnimationSettled: (
        entryId: string,
        generation: number,
      ) => CommandInstance<typeof AnimationMessage.EndedAnimation.Type>
    }>

const ENTER_TRANSITION_GENERATION = 1
const LEAVE_TRANSITION_GENERATION = 2

/** @internal Builds instance-bound test helpers while retaining Toast's
 * private timer Definition and Animation Binding identity. */
export const makeTest = <const BlockValue extends Block.DescriptorContract>({
  block,
  entryAnimationBinding,
  waitBeforeDismissal,
}: Readonly<{
  block: () => BlockValue
  entryAnimationBinding: BindingFor<typeof AnimationBlock>
  waitBeforeDismissal: (
    args: WaitBeforeDismissalArgs,
  ) => CommandInstance<typeof ToastMessage.CompletedWaitBeforeDismissal.Type>
}>): FixtureTest<BlockValue> => {
  const matchWaitForPaint = (entryId: string, generation: number) =>
    __bindCommandMatcher(
      AnimationBlock,
      entryAnimationBinding,
      WaitForPaint({ generation }),
      entryId,
    )

  const matchWaitForAnimationSettled = (entryId: string, generation: number) =>
    __bindCommandMatcher(
      AnimationBlock,
      entryAnimationBinding,
      WaitForAnimationSettled({ id: entryId, generation }),
      entryId,
    )

  /** Drains one freshly shown entry through enter, auto-dismiss, and exit.
   * The helper selects the caller's exact Toast Binding, entry id, timer
   * version, and Animation generations. */
  const drainEntry: DrainEntry<BlockValue> =
    <const BindingValue extends BindingFor<NoInfer<BlockValue>>>({
      binding,
      entryId,
      key,
      version = 0,
    }: DrainEntryInput<BlockValue, BindingValue>) =>
    <Model, Message, OutMessage>(
      simulation: Story.StorySimulation<Model, Message, OutMessage>,
    ): Story.StorySimulation<Model, Message, OutMessage> => {
      const bindToastMatcher = <MatchedMessage>(
        matcher: CommandInstance<MatchedMessage>,
      ) => __bindCommandMatcher(block(), binding, matcher, key)

      const resolveAnimation = (
        current: Story.StorySimulation<Model, Message, OutMessage>,
        generation: number,
      ) => {
        const afterPaint = Story.Command.resolve(
          bindToastMatcher(matchWaitForPaint(entryId, generation)),
          AnimationMessage.CompletedWaitForPaint({ generation }),
        )(current)

        return Story.Command.resolve(
          bindToastMatcher(matchWaitForAnimationSettled(entryId, generation)),
          AnimationMessage.EndedAnimation({ generation }),
        )(afterPaint)
      }

      const afterEnter = resolveAnimation(
        simulation,
        ENTER_TRANSITION_GENERATION,
      )

      const timerMatchers = Array.filterMap(afterEnter.commands, command => {
        const { args } = command
        if (
          !Schema.is(WaitBeforeDismissalArgs)(args) ||
          args.entryId !== entryId ||
          args.version !== version
        ) {
          return Result.failVoid
        }

        const matcher = bindToastMatcher(waitBeforeDismissal(args))
        return matcher.matches(command)
          ? Result.succeed(matcher)
          : Result.failVoid
      })

      const timerMatcher = Array.match(timerMatchers, {
        onEmpty: () => {
          throw new Error(
            `[foldkit/ui] Toast.test.drainEntry could not find the fresh auto-dismiss timer for entry "${entryId}" at version ${String(version)}.`,
          )
        },
        onNonEmpty: nonEmpty => {
          if (Array.isArrayNonEmpty(Array.drop(nonEmpty, 1))) {
            throw new Error(
              `[foldkit/ui] Toast.test.drainEntry found multiple auto-dismiss timers for entry "${entryId}" at version ${String(version)}. Select an unambiguous ancestor Binding occurrence.`,
            )
          }

          return Array.headNonEmpty(nonEmpty)
        },
      })

      const afterTimer = Story.Command.resolve(
        timerMatcher,
        ToastMessage.CompletedWaitBeforeDismissal({ entryId, version }),
      )(afterEnter)

      return resolveAnimation(afterTimer, LEAVE_TRANSITION_GENERATION)
    }

  return {
    matchWaitForPaint,
    matchWaitForAnimationSettled,
    drainEntry,
  }
}
