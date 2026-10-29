import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  Navigation,
  Subscription,
  expectOutMessage,
  given,
  inside,
  role,
  scene,
  unhover,
} from 'foldkit/scene'
import { Url } from 'foldkit/url'

export const Model = Schema.Struct({ url: Schema.String })
export const Message = defineMessageUnion({
  ChangedUrl: { url: Url },
  Ticked: {},
})
export const update = (
  model: typeof Model.Type,
  _message: typeof Message.Type,
) => ({ model })
export const view = (
  _model: typeof Model.Type,
  h: HtmlBuilder<typeof Message.Type>,
) => h.div([h.Role('region'), h.OnMouseLeave(Message.Ticked())])

export const initial = Model.make({ url: '/' })
export const canonicalScene = () =>
  scene(
    { update, view, routing: { onUrlChange: Message.ChangedUrl } },
    given(initial),
    Navigation.changedUrl('/?q=foldkit#results'),
    inside(role('region'), Navigation.changedUrl('?q=next')),
    unhover(role('region')),
  )
export const callbackScene = () =>
  scene(
    {
      update,
      view,
      routing: {
        onUrlChange: url => Message.ChangedUrl({ url }),
        origin: 'https://search.test:444',
      },
    },
    given(initial),
    Navigation.changedUrl('https://other.test/?q=absolute'),
  )

export const OutMessage = defineMessageUnion({
  ChangedLocation: { pathname: Schema.String },
})
const Definition = Block.makeDefinition('SceneRoutingFixture', {
  Model,
  Message,
  OutMessage,
})
export const routingSubscriptions = Definition.makeSubscriptions(entry => ({
  ticks: entry('Ticks', { messages: [Message.Ticked] }),
}))
const Composition = Definition.makeComposition()
export const updateWithOutMessage = Composition.makeUpdate({
  ChangedUrl: (model, { url }) => ({
    model,
    outMessage: OutMessage.ChangedLocation({ pathname: url.pathname }),
  }),
  Ticked: model => ({ model }),
})
export const combinedScene = () =>
  scene(
    {
      update: updateWithOutMessage,
      view,
      subscriptions: routingSubscriptions,
      routing: { onUrlChange: url => Message.ChangedUrl({ url }) },
    },
    given(initial),
    Navigation.changedUrl('/results'),
    expectOutMessage(OutMessage.ChangedLocation({ pathname: '/results' })),
    Subscription.emit(routingSubscriptions.ticks, Message.Ticked()),
  )
export const explicitSubscriptionScene = () =>
  scene<typeof Model.Type, typeof Message.Type, typeof routingSubscriptions>(
    {
      update,
      view,
      subscriptions: routingSubscriptions,
      routing: { onUrlChange: Message.ChangedUrl },
    },
    given(initial),
    Navigation.changedUrl('/'),
    Subscription.emit(routingSubscriptions.ticks, Message.Ticked()),
  )
export const explicitOutMessageScene = () =>
  scene<
    typeof Model.Type,
    typeof Message.Type,
    typeof OutMessage.Type,
    typeof routingSubscriptions
  >(
    {
      update: updateWithOutMessage,
      view,
      subscriptions: routingSubscriptions,
      routing: { onUrlChange: Message.ChangedUrl },
    },
    given(initial),
    Navigation.changedUrl('/'),
    expectOutMessage(OutMessage.ChangedLocation({ pathname: '/' })),
    Subscription.emit(routingSubscriptions.ticks, Message.Ticked()),
  )
