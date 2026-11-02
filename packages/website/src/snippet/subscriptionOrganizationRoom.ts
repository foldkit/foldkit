import { Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ReceivedRoomEvent: { text: Schema.String },
  PressedKey: { key: Schema.String },
  InformedOfDialogChange: { isDialogOpen: Schema.Boolean },
})

export class Room extends Block<Room, Readonly<{ roomId: string }>>()('Room', {
  Model: Schema.Struct({
    roomId: Schema.String,
    transcript: Schema.Array(Schema.String),
    isDialogOpen: Schema.Boolean,
  }),
  Message,
}) {}

const roomEvents = (roomId: string) =>
  Stream.unwrap(
    Effect.acquireRelease(
      Effect.sync(() => new EventSource(`/rooms/${roomId}/events`)),
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

export const RoomLive = Room.toLayer(() => ({
  init: ({ roomId }) => ({ roomId, transcript: [], isDialogOpen: false }),

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
    roomEvents: {
      dependencies: model => model.roomId,
      stream: roomEvents,
    },
    keyPresses: {
      dependencies: model => model.isDialogOpen,
      stream: keyPresses,
    },
  },
}))
