import { Array, Schema } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

const Message = defineMessageUnion({
  CompletedPaint: { generation: Schema.Number },
})
type Message = typeof Message.Type

const Paint = Command.define('Paint', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedPaint],
})

const requireExactlyOne = <Value>(values: ReadonlyArray<Value>): Value =>
  Array.match(values, {
    onEmpty: () => {
      throw new Error('Expected a pending Paint Command')
    },
    onNonEmpty: nonEmpty => {
      if (Array.isArrayNonEmpty(Array.tailNonEmpty(nonEmpty))) {
        throw new Error('Expected only one pending Paint Command')
      }
      return Array.headNonEmpty(nonEmpty)
    },
  })

export const inspectStoryPaint = <Model, ParentMessage, OutMessage>(
  simulation: Story.StorySimulation<Model, ParentMessage, OutMessage>,
) => {
  const args = requireExactlyOne(
    Array.getSomes(Array.map(simulation.commands, Story.Command.argsOf(Paint))),
  )

  expect(args.generation).toBe(4)

  return Story.Command.resolve(
    Paint(args),
    Message.CompletedPaint({ generation: args.generation }),
  )(simulation)
}

export const inspectScenePaint = <Model, ParentMessage, OutMessage>(
  simulation: Scene.SceneSimulation<Model, ParentMessage, OutMessage>,
) => {
  const args = requireExactlyOne(
    Array.getSomes(Array.map(simulation.commands, Scene.Command.argsOf(Paint))),
  )

  expect(args.generation).toBe(4)

  return Scene.Command.resolve(
    Paint(args),
    Message.CompletedPaint({ generation: args.generation }),
  )(simulation)
}
