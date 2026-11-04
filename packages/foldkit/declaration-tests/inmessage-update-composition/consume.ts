import * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'

import { ApplicationBlock, layer } from './accepted.js'
import { ContextBlock, ContextInMessage, contextLayer } from './accepted.js'
import { InMessage, Message, Model, OutMessage, SaveDraft } from './accepted.js'

export { makeInMessageUpdate } from './accepted.js'
export { focused, increment, inMessageUpdate } from './accepted.js'

export const inspect = Story.withBlock(
  { block: ApplicationBlock, layer },
  app => {
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
  },
)

export const contexts = Story.withBlock(
  { block: ContextBlock, layer: contextLayer },
  app => {
    const initial = app.init().model
    const input = ContextInMessage.RequestedValue({ value: 1 })

    return [
      app.inMessageUpdate(initial, input),
      app.inMessageUpdate(input)(initial, 'Remote', 'A', 'B'),
    ]
  },
)

export const pureStory = Story.story(
  { block: ApplicationBlock, layer },
  Story.init(),
  Story.inMessage(InMessage.RequestedSave({ text: 'intent only' })),
  Story.Command.expectExact(SaveDraft({ text: 'intent only' })),
  Story.Command.resolve(SaveDraft, Message.CompletedSaveDraft()),
)

export function rejected(
  app: Block.ExecutableOf<typeof ApplicationBlock>,
  model: Model,
) {
  // @ts-expect-error A local Message is not an InMessage.
  app.inMessageUpdate(model, Message.ClickedIncrement())
  // @ts-expect-error RequestedSet has a numeric decoded payload.
  app.inMessageUpdate(model, InMessage.RequestedSet({ value: 'wrong' }))
  // @ts-expect-error An input entry without Context cannot accept extra context.
  app.inMessageUpdate(model, InMessage.RequestedSet({ value: 1 }), 'extra')
}
