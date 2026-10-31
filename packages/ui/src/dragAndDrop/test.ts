import { Array, Equal, Option, Predicate, Result, pipe } from 'effect'
import { Block } from 'foldkit'
import * as Story from 'foldkit/story'

import { FocusItem, Message, ResolveKeyboardMove } from './block.js'

export { FocusItem, ResolveKeyboardMove }

type InstancePath = string | ReadonlyArray<string>

type StoryTransform = <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
) => Story.StorySimulation<Model, Message, OutMessage>

const toPath = (path: InstancePath): ReadonlyArray<string> =>
  Predicate.isString(path) ? [path] : path

const commandPath = (command: Story.AnyCommand): ReadonlyArray<string> => {
  const routed = Array.reduce(
    command.messageMappers ?? [],
    Message.CompletedFocusItem(),
    (message: unknown, mapper) => mapper(message),
  )
  return Block.isBlockMessage(routed) ? routed.path : []
}

const isAtPath = (
  maybePath: Option.Option<ReadonlyArray<string>>,
  command: Story.AnyCommand,
): boolean =>
  Option.match(maybePath, {
    onNone: () => true,
    onSome: path =>
      Equal.equals(Array.fromIterable(path), commandPath(command)),
  })

const describePath = (maybePath: Option.Option<ReadonlyArray<string>>) =>
  Option.match(maybePath, {
    onNone: () => '',
    onSome: path => ` at path ${JSON.stringify(path)}`,
  })

const findFocusAtPath = (
  commands: ReadonlyArray<Story.AnyCommand>,
  maybePath: Option.Option<ReadonlyArray<string>>,
  itemId: string,
): boolean =>
  Array.some(
    commands,
    command =>
      isAtPath(maybePath, command) &&
      Option.exists(
        Story.Command.argsOf(FocusItem)(command),
        args => args.itemId === itemId,
      ),
  )

const assertFocusPending = (
  commands: ReadonlyArray<Story.AnyCommand>,
  maybePath: Option.Option<ReadonlyArray<string>>,
  itemId: string,
): void => {
  if (
    Option.isSome(maybePath) &&
    !findFocusAtPath(commands, maybePath, itemId)
  ) {
    throw new Error(
      `[foldkit/ui] DragAndDrop.test could not find a pending FocusItem for item "${itemId}"${describePath(maybePath)}.`,
    )
  }
}

const resolveFocus =
  (
    maybePath: Option.Option<ReadonlyArray<string>>,
    itemId: string,
  ): StoryTransform =>
  simulation => {
    assertFocusPending(simulation.commands, maybePath, itemId)

    return Story.Command.resolve(
      FocusItem({ itemId }),
      Message.CompletedFocusItem(),
    )(simulation)
  }

/** Identifies the item whose focus Command {@link settleFocus} resolves.
 *  Pass `path` when testing an embedded DragAndDrop instance. It addresses the
 *  instance from the Story root, in the same form `Block.deliver` takes. */
export type SettleFocusInput = Readonly<{
  itemId: string
  path?: InstancePath
}>

/** Returns a Story step that resolves `FocusItem({ itemId })` after a keyboard
 *  drop, cancellation, or move. The step fails if no matching Command is
 *  pending and leaves unrelated Commands pending. Pass `path` to require that
 *  the Command belongs to one embedded DragAndDrop instance.
 *
 *  @example
 *  ```ts
 *  story(
 *    DragAndDropLive,
 *    {},
 *    message(DragAndDrop.Message.ActivatedKeyboardDrag({ itemId: 'card-1', containerId: 'todo', index: 0 })),
 *    message(DragAndDrop.Message.ConfirmedKeyboardDrop()),
 *    DragAndDrop.test.settleFocus({ itemId: 'card-1' }),
 *  )
 *  ```
 */
export const settleFocus = ({ itemId, path }: SettleFocusInput) =>
  resolveFocus(Option.map(Option.fromUndefinedOr(path), toPath), itemId)

/** The dragged item and target position supplied to
 *  {@link resolveKeyboardMove}. Pass `path` when testing an embedded
 *  DragAndDrop instance. It addresses the instance from the Story root, in the
 *  same form `Block.deliver` takes. */
export type ResolveKeyboardMoveInput = Readonly<{
  itemId: string
  targetContainerId: string
  targetIndex: number
  path?: InstancePath
}>

const resolveSelectedKeyboardMove =
  (
    maybePath: Option.Option<ReadonlyArray<string>>,
    itemId: string,
    targetContainerId: string,
    targetIndex: number,
  ): StoryTransform =>
  simulation => {
    const pendingMoves = Array.filterMap(simulation.commands, command =>
      pipe(
        Story.Command.argsOf(ResolveKeyboardMove)(command),
        Option.filter(
          args => args.itemId === itemId && isAtPath(maybePath, command),
        ),
        Result.fromOption(() => undefined),
      ),
    )

    const selectedArgs = Array.match(pendingMoves, {
      onEmpty: () => {
        throw new Error(
          `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove could not find a pending keyboard move for item "${itemId}"${describePath(maybePath)}.`,
        )
      },
      onNonEmpty: nonEmpty => {
        if (Array.isArrayNonEmpty(Array.drop(nonEmpty, 1))) {
          throw new Error(
            Option.isNone(maybePath)
              ? `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove found multiple pending keyboard moves for item "${itemId}". Isolate one pending move in this Story, or pass a path when the candidates come from embedded instances.`
              : `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove found multiple pending keyboard moves for item "${itemId}"${describePath(maybePath)}. Isolate one pending move in this Story.`,
          )
        }

        return Array.headNonEmpty(nonEmpty)
      },
    })

    const identicalMoveCount = Array.length(
      Array.filter(simulation.commands, command =>
        Option.exists(
          Story.Command.argsOf(ResolveKeyboardMove)(command),
          args => Equal.equals(args, selectedArgs),
        ),
      ),
    )

    if (identicalMoveCount > 1) {
      throw new Error(
        `[foldkit/ui] DragAndDrop.test.resolveKeyboardMove found identical pending keyboard moves for item "${itemId}" in several DragAndDrop instances. Isolate one instance's move in this Story.`,
      )
    }

    const afterMove = Story.Command.resolve(
      ResolveKeyboardMove(selectedArgs),
      Message.CompletedResolveKeyboardMove({
        keyboardDragGeneration: selectedArgs.keyboardDragGeneration,
        targetContainerId,
        targetIndex,
      }),
    )(simulation)

    return resolveFocus(maybePath, itemId)(afterMove)
  }

/** Returns Story steps that resolve a pending `ResolveKeyboardMove` to the
 *  supplied container and index, then resolve `FocusItem` for `itemId`.
 *
 *  The steps fail if either Command is missing or multiple keyboard moves are
 *  pending. Unrelated Commands stay pending. Pass `path` to select the move of
 *  one embedded DragAndDrop instance. Two instances with identical pending
 *  moves cannot be told apart by resolution, so the helper rejects them.
 *
 *  @example
 *  ```ts
 *  story(
 *    DragAndDropLive,
 *    {},
 *    message(DragAndDrop.Message.ActivatedKeyboardDrag({ itemId: 'card-1', containerId: 'todo', index: 0 })),
 *    message(DragAndDrop.Message.PressedArrowKey({ direction: 'NextContainer' })),
 *    DragAndDrop.test.resolveKeyboardMove({
 *      itemId: 'card-1',
 *      targetContainerId: 'done',
 *      targetIndex: 0,
 *    }),
 *  )
 *  ```
 */
export const resolveKeyboardMove = ({
  itemId,
  targetContainerId,
  targetIndex,
  path,
}: ResolveKeyboardMoveInput) =>
  resolveSelectedKeyboardMove(
    Option.map(Option.fromUndefinedOr(path), toPath),
    itemId,
    targetContainerId,
    targetIndex,
  )
