import { Array, Result, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'
import { __bindCommandMatcher, __commandMatches } from 'foldkit/test'

import {
  DragAndDropBlock,
  FocusItem,
  Message,
  ResolveKeyboardMove,
  ResolveKeyboardMoveArgs,
} from './block.js'

export { FocusItem, ResolveKeyboardMove }

type BindingFor<BlockValue> = Block.AnyBinding &
  Block.BindingEvidence<BlockValue, unknown, unknown, boolean>

type DragAndDropBinding = BindingFor<typeof DragAndDropBlock>

type BindingOccurrence<BindingValue> =
  BindingValue extends Block.BindingEvidence<unknown, unknown, unknown, true> &
    Readonly<{ fold: (...args: infer Args) => unknown }>
    ? Args extends readonly [unknown, infer Key, ...ReadonlyArray<unknown>]
      ? Readonly<{ key: Key & (string | number) }>
      : never
    : Readonly<{ key?: never }>

type BindingSelection<BindingValue> = BindingValue extends DragAndDropBinding
  ? Readonly<{ binding: BindingValue }> & BindingOccurrence<BindingValue>
  : Readonly<{ binding?: never; key?: never }>

type StoryTransform = <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
) => Story.StorySimulation<Model, Message, OutMessage>

const assertBindingSelectedForKey = (
  binding: DragAndDropBinding | undefined,
  key: string | number | undefined,
) => {
  if (binding === undefined && key !== undefined) {
    throw new Error(
      '[foldkit/ui] DragAndDrop.test helpers require a Binding when key is provided.',
    )
  }
}

/** Identifies the item whose focus Command {@link settleFocus} resolves.
 * Pass `binding` when testing an embedded DragAndDrop Block. A keyed Binding
 * also requires its exact occurrence `key`. */
export type SettleFocusInput<
  BindingValue extends DragAndDropBinding | undefined = undefined,
> = Readonly<{
  itemId: string
}> &
  BindingSelection<BindingValue>

const selectedFocusMatcher = (
  binding: DragAndDropBinding | undefined,
  key: string | number | undefined,
  itemId: string,
) =>
  binding === undefined
    ? FocusItem({ itemId })
    : __bindCommandMatcher(
        DragAndDropBlock,
        binding,
        FocusItem({ itemId }),
        key,
      )

/** Returns a Story step that resolves `FocusItem({ itemId })` after a keyboard
 *  drop, cancellation, or move. The step fails if no matching Command is pending
 *  and leaves unrelated Commands pending. Pass the DragAndDrop Binding, plus
 *  its key when keyed, to select one embedded occurrence.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    DragAndDropBlock.update,
 *    Story.given(model),
 *    Story.message(DragAndDropBlock.Message.ConfirmedKeyboardDrop()),
 *    DragAndDrop.test.settleFocus({ itemId: 'card-1' }),
 *  )
 *  ```
 */
export const settleFocus = <
  const BindingValue extends DragAndDropBinding | undefined = undefined,
>({
  itemId,
  binding,
  key,
}: SettleFocusInput<BindingValue>) => {
  assertBindingSelectedForKey(binding, key)

  return binding === undefined
    ? Story.Command.resolve(FocusItem({ itemId }), Message.CompletedFocusItem())
    : Story.Command.resolve(
        selectedFocusMatcher(binding, key, itemId),
        Message.CompletedFocusItem(),
      )
}

/** The dragged item and target position supplied to
 * {@link resolveKeyboardMove}. Pass `binding` when testing an embedded
 * DragAndDrop Block. A keyed Binding also requires its exact occurrence
 * `key`. */
export type ResolveKeyboardMoveInput<
  BindingValue extends DragAndDropBinding | undefined = undefined,
> = Readonly<{
  itemId: string
  targetContainerId: string
  targetIndex: number
}> &
  BindingSelection<BindingValue>

const resolveSelectedKeyboardMove =
  (
    binding: DragAndDropBinding | undefined,
    key: string | number | undefined,
    itemId: string,
    targetContainerId: string,
    targetIndex: number,
  ): StoryTransform =>
  <Model, ParentMessage, OutMessage>(
    simulation: Story.StorySimulation<Model, ParentMessage, OutMessage>,
  ): Story.StorySimulation<Model, ParentMessage, OutMessage> => {
    const matchers = Array.filterMap(simulation.commands, command => {
      const { args } = command
      if (!Schema.is(ResolveKeyboardMoveArgs)(args) || args.itemId !== itemId) {
        return Result.failVoid
      }

      const instance = ResolveKeyboardMove(args)
      const matcher =
        binding === undefined
          ? instance
          : __bindCommandMatcher(DragAndDropBlock, binding, instance, key)
      return __commandMatches(matcher, command)
        ? Result.succeed({
            keyboardDragGeneration: args.keyboardDragGeneration,
            matcher,
          })
        : Result.failVoid
    })

    const selectedMove = Array.match(matchers, {
      onEmpty: () => {
        throw new Error(
          binding === undefined
            ? `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove could not find a pending keyboard move for item "${itemId}".`
            : `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove could not find a pending keyboard move for item "${itemId}" at the selected Binding occurrence.`,
        )
      },
      onNonEmpty: nonEmpty => {
        if (Array.isArrayNonEmpty(Array.drop(nonEmpty, 1))) {
          throw new Error(
            binding === undefined
              ? `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove found multiple pending keyboard moves for item "${itemId}". Isolate one pending move in this Story, or pass a Binding when the candidates come from embedded occurrences.`
              : `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove found multiple pending keyboard moves for item "${itemId}" under the selected Binding. Isolate one ancestor occurrence in this Story.`,
          )
        }

        return Array.headNonEmpty(nonEmpty)
      },
    })

    const afterMove = Story.Command.resolve(
      selectedMove.matcher,
      Message.CompletedResolveKeyboardMove({
        keyboardDragGeneration: selectedMove.keyboardDragGeneration,
        targetContainerId,
        targetIndex,
      }),
    )(simulation)

    return Story.Command.resolve(
      selectedFocusMatcher(binding, key, itemId),
      Message.CompletedFocusItem(),
    )(afterMove)
  }

/** Returns Story steps that resolve a pending `ResolveKeyboardMove` to the
 *  supplied container and index, then resolve `FocusItem` for `itemId`.
 *
 *  The steps fail if either Command is missing or multiple keyboard moves are
 *  pending. Unrelated Commands stay pending. Pass the DragAndDrop Binding,
 *  plus its key when keyed, to select one embedded occurrence and verify the
 *  pending move belongs to `itemId`. Binding selection matches the composed
 *  path suffix. When an enclosing Binding repeats that path, isolate one
 *  ancestor occurrence in the Story; the helper rejects the ambiguity.
 *
 *  @example
 *  ```ts
 *  Story.story(
 *    DragAndDropBlock.update,
 *    Story.given(keyboardDraggingModel),
 *    Story.message(
 *      DragAndDropBlock.Message.PressedArrowKey({
 *        direction: 'NextContainer',
 *      }),
 *    ),
 *    DragAndDrop.test.resolveKeyboardMove({
 *      itemId: 'card-1',
 *      targetContainerId: 'done',
 *      targetIndex: 0,
 *    }),
 *  )
 *  ```
 */
export const resolveKeyboardMove = <
  const BindingValue extends DragAndDropBinding | undefined = undefined,
>({
  itemId,
  targetContainerId,
  targetIndex,
  binding,
  key,
}: ResolveKeyboardMoveInput<BindingValue>) => {
  assertBindingSelectedForKey(binding, key)

  return resolveSelectedKeyboardMove(
    binding,
    key,
    itemId,
    targetContainerId,
    targetIndex,
  )
}
