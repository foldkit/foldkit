import { Boolean, Effect, Option, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import * as ManagedResource from '../../managedResource/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  isFeedOpen: Schema.Boolean,
  status: Schema.Literals(['Disconnected', 'Connected', 'Failed']),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedToggleFeed: {},
  AcquiredFeedSocket: { socketId: Schema.String },
  ReleasedFeedSocket: {},
  FailedAcquireFeedSocket: { error: Schema.String },
})

export type Message = typeof Message.Type

// MANAGED RESOURCE

export type FeedSocket = Readonly<{ socketId: string }>

const FeedSocketResource = ManagedResource.tag<FeedSocket>()('FeedSocket')

const PresenceResource = ManagedResource.tag<string>()('Presence')

export const feedResources = ManagedResource.make<Model, Message>()(entry => ({
  feedSocket: entry(Schema.Option(Schema.Struct({ channel: Schema.String })), {
    resource: FeedSocketResource,
    modelToMaybeRequirements: model =>
      model.isFeedOpen ? Option.some({ channel: 'general' }) : Option.none(),
    acquire: () => Effect.succeed({ socketId: 'live' }),
    release: () => Effect.void,
    onAcquired: socket =>
      Message.AcquiredFeedSocket({ socketId: socket.socketId }),
    onReleased: () => Message.ReleasedFeedSocket(),
    onAcquireError: error =>
      Message.FailedAcquireFeedSocket({ error: String(error) }),
  }),
  presence: entry(Schema.Option(Schema.Null), {
    resource: PresenceResource,
    modelToMaybeRequirements: model =>
      model.isFeedOpen ? Option.some(null) : Option.none(),
    acquire: () => Effect.succeed('online'),
    release: () => Effect.void,
    onAcquired: () => Message.AcquiredFeedSocket({ socketId: 'presence' }),
    onReleased: () => Message.ReleasedFeedSocket(),
    onAcquireError: error =>
      Message.FailedAcquireFeedSocket({ error: String(error) }),
  }),
}))

// INIT

export const initialModel = Model.make({
  isFeedOpen: false,
  status: 'Disconnected',
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedToggleFeed: () => ({
      model: evo(model, { isFeedOpen: Boolean.not }),
    }),
    AcquiredFeedSocket: () => ({
      model: evo(model, { status: () => 'Connected' }),
    }),
    ReleasedFeedSocket: () => ({
      model: evo(model, { status: () => 'Disconnected' }),
    }),
    FailedAcquireFeedSocket: () => ({
      model: evo(model, { status: () => 'Failed' }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.span([h.Role('status')], [model.status]),
      h.button(
        [h.OnClick(Message.ClickedToggleFeed()), h.Role('button')],
        [model.isFeedOpen ? 'Close feed' : 'Open feed'],
      ),
    ],
  )
