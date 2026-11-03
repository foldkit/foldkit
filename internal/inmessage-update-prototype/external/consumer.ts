import { Effect } from 'effect'
import * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'

import { ApplicationBlock } from './app/block.js'
import { ContextBlock, InMessage as ContextInMessage } from './app/context.js'
import {
  ApplicationDefinition,
  InMessage,
  Message,
  Model,
  OutMessage,
  SaveDraft,
} from './app/definition.js'

export { makeInMessageUpdate } from './app/composition.js'
export { focused, increment, inMessageUpdate } from './app/update.js'

export const inspect = Effect.scoped(
  Effect.gen(function* () {
    const app = yield* ApplicationBlock.get
    const initial = app.init().model
    const silent = app.inMessageUpdate(
      initial,
      InMessage.RequestedSet({ value: 2 }),
    )
    const emitted = app.inMessageUpdate(
      InMessage.RequestedSubmit({ text: 'public' }),
    )(initial)
    const noOut: undefined = silent.outMessage
    const out: typeof OutMessage.Submitted.Type | undefined = emitted.outMessage
    return { noOut, out }
  }),
).pipe(Effect.provide(ApplicationBlock.layer))

export const contexts = Effect.scoped(
  Effect.gen(function* () {
    const app = yield* ContextBlock.get
    const initial = app.init().model
    const input = ContextInMessage.RequestedValue({ value: 1 })
    return [
      app.inMessageUpdate(initial, input),
      app.inMessageUpdate(input)(initial, 'Remote', 'A', 'B'),
    ]
  }),
).pipe(Effect.provide(ContextBlock.layer))

export const pureStory = Story.story(
  ApplicationBlock,
  Story.init(),
  Story.inMessage(InMessage.RequestedSave({ text: 'intent only' })),
  Story.Command.expectExact(SaveDraft({ text: 'intent only' })),
  Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
).pipe(Effect.provide(ApplicationBlock.layer))

export function rejected(
  app: Block.ExecutableOf<typeof ApplicationDefinition.contract>,
  model: Model,
) {
  // @ts-expect-error A local Message is not an InMessage.
  app.inMessageUpdate(model, Message.ClickedIncrement())
  // @ts-expect-error RequestedSet has a numeric decoded payload.
  app.inMessageUpdate(model, InMessage.RequestedSet({ value: 'wrong' }))
  // @ts-expect-error An input entry without Context cannot accept extra context.
  app.inMessageUpdate(model, InMessage.RequestedSet({ value: 1 }), 'extra')
}
