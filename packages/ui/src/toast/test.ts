import { Array, Option, Predicate, String } from 'effect'
import { Block } from 'foldkit'
import * as Story from 'foldkit/story'

import { WaitForAnimationSettled, WaitForPaint } from '../animation/block.js'
import { Message as AnimationMessage } from '../animation/schema.js'
import { Message as ToastMessage } from './schema.js'
import { WaitBeforeDismissal } from './update.js'

/** Input for a Toast's `test.drainEntry` helper. `path` selects the Toast
 *  instance by its path from the Story's root Block, as in `Block.deliver`;
 *  omit it when the Toast is the root. `entryId` selects a freshly shown
 *  entry, and `version` defaults to its initial timer version `0`. */
export type DrainEntryInput = Readonly<{
  path?: string | ReadonlyArray<string>
  entryId: string
  version?: number
}>

/** Story step that drains one freshly shown Toast entry. */
export type DrainEntry = (
  input: DrainEntryInput,
) => <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
) => Story.StorySimulation<Model, Message, OutMessage>

/** Test helpers attached to a Toast Block class. */
export type ToastTest = Readonly<{
  drainEntry: DrainEntry
}>

const ENTER_TRANSITION_GENERATION = 1
const LEAVE_TRANSITION_GENERATION = 2

const PATH_PROBE = { _tag: 'ToastTestPathProbe' }

const commandPath = (command: Story.AnyCommand): ReadonlyArray<string> => {
  const probe = Array.reduce(
    command.messageMappers ?? [],
    PATH_PROBE,
    (message: unknown, mapper) => mapper(message),
  )
  return Block.isBlockMessage(probe) ? probe.path : []
}

const isSamePath = Array.makeEquivalence(String.Equivalence)

type PendingSelection = Readonly<{
  description: string
  path: ReadonlyArray<string>
  isSelected: (command: Story.AnyCommand) => boolean
}>

const selectPending = <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
  { description, path, isSelected }: PendingSelection,
): Story.StorySimulation<Model, Message, OutMessage> => {
  const matches = Array.filter(
    simulation.commands,
    command => isSelected(command) && isSamePath(commandPath(command), path),
  )

  return Array.match(matches, {
    onEmpty: () => {
      throw new Error(
        `[foldkit/ui] Toast.test.drainEntry could not find ${description}.`,
      )
    },
    onNonEmpty: nonEmpty => {
      if (Array.isArrayNonEmpty(Array.drop(nonEmpty, 1))) {
        throw new Error(
          `[foldkit/ui] Toast.test.drainEntry found multiple ${description}.`,
        )
      }

      const selected = Array.headNonEmpty(nonEmpty)
      return {
        ...simulation,
        commands: [
          selected,
          ...Array.filter(simulation.commands, command => command !== selected),
        ],
      }
    },
  })
}

const toPath = (
  path: string | ReadonlyArray<string> | undefined,
): ReadonlyArray<string> => {
  if (path === undefined) {
    return []
  } else if (Predicate.isString(path)) {
    return [path]
  } else {
    return path
  }
}

const resolveAnimation = <Model, Message, OutMessage>(
  simulation: Story.StorySimulation<Model, Message, OutMessage>,
  entryPath: ReadonlyArray<string>,
  entryId: string,
  generation: number,
) => {
  const paintSelected = selectPending(simulation, {
    description: `the paint wait for entry "${entryId}" at generation ${globalThis.String(generation)}`,
    path: entryPath,
    isSelected: command =>
      Option.exists(
        Story.Command.argsOf(WaitForPaint)(command),
        args => args.generation === generation,
      ),
  })
  const afterPaint = Story.Command.resolveAll([
    WaitForPaint({ generation }),
    AnimationMessage.CompletedWaitForPaint({ generation }),
  ])(paintSelected)

  const settleSelected = selectPending(afterPaint, {
    description: `the animation settle wait for entry "${entryId}" at generation ${globalThis.String(generation)}`,
    path: entryPath,
    isSelected: command =>
      Option.exists(
        Story.Command.argsOf(WaitForAnimationSettled)(command),
        args => args.id === entryId && args.generation === generation,
      ),
  })
  return Story.Command.resolveAll([
    WaitForAnimationSettled({ id: entryId, generation }),
    AnimationMessage.EndedAnimation({ generation }),
  ])(settleSelected)
}

/** Drains one freshly shown entry through enter, auto-dismiss, and exit. The
 *  helper selects the Commands of the Toast at `path` and its entry
 *  `entryId`, so other Toast instances and entries can have identical pending
 *  Commands. */
const drainEntry: DrainEntry =
  ({ path, entryId, version = 0 }) =>
  simulation => {
    const toastPath = toPath(path)
    const entryPath = [...toastPath, 'entries', entryId]

    const afterEnter = resolveAnimation(
      simulation,
      entryPath,
      entryId,
      ENTER_TRANSITION_GENERATION,
    )

    const isFreshTimer = (command: Story.AnyCommand) =>
      Option.exists(
        Story.Command.argsOf(WaitBeforeDismissal)(command),
        args => args.entryId === entryId && args.version === version,
      )
    const timerSelected = selectPending(afterEnter, {
      description: `the fresh auto-dismiss timer for entry "${entryId}" at version ${globalThis.String(version)}`,
      path: toastPath,
      isSelected: isFreshTimer,
    })
    const timerArgs = Option.getOrThrow(
      Option.flatMap(Array.head(timerSelected.commands), command =>
        Story.Command.argsOf(WaitBeforeDismissal)(command),
      ),
    )
    const afterTimer = Story.Command.resolveAll([
      WaitBeforeDismissal(timerArgs),
      ToastMessage.CompletedWaitBeforeDismissal({ entryId, version }),
    ])(timerSelected)

    return resolveAnimation(
      afterTimer,
      entryPath,
      entryId,
      LEAVE_TRANSITION_GENERATION,
    )
  }

/** @internal Builds the test helpers attached to a Toast Block class. */
export const makeTest = (): ToastTest => ({ drainEntry })
