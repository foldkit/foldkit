import { Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ReceivedRoomEvent: { text: Schema.String },
  PressedKey: { key: Schema.String },
  InformedOfDialogChange: { isDialogOpen: Schema.Boolean },
})

export class Room extends Block<Room>()('Room', {
  Model: Schema.Struct({
    transcript: Schema.Array(Schema.String),
    isDialogOpen: Schema.Boolean,
  }),
  Message,
}) {}

const roomEvents = Stream.unwrap(
  Effect.acquireRelease(
    Effect.sync(() => new EventSource('/room/events')),
    source => Effect.sync(() => source.close()),
  ).pipe(
    Effect.map(source =>
      Stream.fromEventListener<MessageEvent<string>>(source, 'message').pipe(
        Stream.map(({ data }) => Message.ReceivedRoomEvent({ text: data })),
      ),
    ),
  ),
)

const keyPresses = (isDialogOpen: boolean) =>
  isDialogOpen
    ? Stream.empty
    : Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.map(({ key }) => Message.PressedKey({ key })),
      )

export const RoomLive = Room.make(
  Effect.fn(function* () {
    return {
      model: { transcript: [], isDialogOpen: false },

      stream: roomEvents,

      update: {
        ReceivedRoomEvent: (model, { text }) => ({
          model: modifyFields(model, {
            transcript: transcript => [...transcript, text],
          }),
        }),
        PressedKey: (model, { key }) => ({
          model: modifyFields(model, {
            transcript: transcript => [...transcript, `You pressed ${key}`],
          }),
        }),
        InformedOfDialogChange: (model, { isDialogOpen }) => ({
          model: modifyFields(model, { isDialogOpen: () => isDialogOpen }),
        }),
      },

      subscriptions: {
        keyPresses: {
          dependencies: model => model.isDialogOpen,
          stream: keyPresses,
        },
      },
    }
  }),
)
