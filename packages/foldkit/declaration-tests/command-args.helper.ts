import { Array } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { Message, Paint } from './command-args.accepted.js'

const requireExactlyOne = <Value>(values: ReadonlyArray<Value>): Value =>
  Array.match(values, {
    onEmpty: () => {
      throw new Error('Expected a pending paint Command')
    },
    onNonEmpty: nonEmpty => {
      if (Array.isArrayNonEmpty(Array.tailNonEmpty(nonEmpty))) {
        throw new Error('Expected only one pending paint Command')
      }
      return Array.headNonEmpty(nonEmpty)
    },
  })

export const extractPaintArgs = (commands: ReadonlyArray<Story.AnyCommand>) =>
  Array.getSomes(Array.map(commands, Story.Command.argsOf(Paint)))

export const resolveStoryPaint = (
  commands: ReadonlyArray<Story.AnyCommand>,
) => {
  const args = requireExactlyOne(extractPaintArgs(commands))
  return Story.Command.resolve(
    Paint(args),
    Message.CompletedPaint({ generation: args.generation }),
  )
}

export const resolveScenePaint = (
  commands: ReadonlyArray<Scene.AnyCommand>,
) => {
  const args = requireExactlyOne(
    Array.getSomes(Array.map(commands, Scene.Command.argsOf(Paint))),
  )
  return Scene.Command.resolve(
    Paint(args),
    Message.CompletedPaint({ generation: args.generation }),
  )
}
