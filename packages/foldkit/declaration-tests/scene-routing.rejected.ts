import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import {
  Navigation,
  type SceneRouting,
  type SceneStep,
  Subscription,
  expectOutMessage,
  given,
  inside,
  role,
  scene,
} from 'foldkit/scene'

import {
  Message,
  Model,
  OutMessage,
  initial,
  routingSubscriptions,
  update,
  view,
} from './scene-routing.accepted.js'

scene(
  { update, view },
  given(initial),
  // @ts-expect-error navigation requires routing configuration
  Navigation.changedUrl('/'),
)
scene(
  { update, view },
  given(initial),
  // @ts-expect-error nesting does not grant routing configuration
  inside(role('region'), Navigation.changedUrl('/')),
)
const ForeignMessage = defineMessageUnion({ Other: {} })
scene(
  {
    update,
    view,
    routing: {
      // @ts-expect-error routing callbacks must return the Scene Message
      onUrlChange: () => ForeignMessage.Other(),
    },
  },
  given(initial),
)
const WrongPayload = defineMessageUnion({ ChangedUrl: { url: Schema.String } })
scene(
  {
    update,
    view,
    routing: {
      // @ts-expect-error canonical constructors must accept a Foldkit Url
      onUrlChange: WrongPayload.ChangedUrl,
    },
  },
  given(initial),
)
declare const routing: SceneRouting<typeof Message.Type> | undefined
scene(
  { update, view, routing },
  given(initial),
  // @ts-expect-error routing must be definitely configured
  Navigation.changedUrl('/'),
)

const WrongOriginMessage = defineMessageUnion({
  ChangedUrl: { url: Schema.Number },
})
scene(
  {
    update,
    view,
    routing: {
      // @ts-expect-error callback parameters must accept a Foldkit Url
      onUrlChange: (_url: string) =>
        Message.ChangedUrl({
          url: {
            protocol: 'https:',
            host: 'search.test',
            port: Option.none(),
            pathname: '/',
            search: Option.none(),
            hash: Option.none(),
          },
        }),
    },
  },
  given(initial),
)
// @ts-expect-error a URL step accepts a URL string
Navigation.changedUrl(WrongOriginMessage.ChangedUrl({ url: 1 }))

type RoutedStep = SceneStep<
  typeof Model.Type,
  typeof Message.Type,
  typeof OutMessage.Type,
  typeof routingSubscriptions,
  SceneRouting<typeof Message.Type>
>
// @ts-expect-error routing does not widen the OutMessage contract
export const invalidOutMessage: RoutedStep = expectOutMessage(
  ForeignMessage.Other(),
)
const ForeignDefinition = Block.makeDefinition('ForeignSceneRoutingFixture', {
  Model,
  Message: ForeignMessage,
})
const foreignSubscriptions = ForeignDefinition.makeSubscriptions(entry => ({
  events: entry('Events', { messages: [ForeignMessage.Other] }),
}))
// @ts-expect-error routing does not register a foreign Subscription or its raw Message
export const invalidSubscription: RoutedStep = Subscription.emit(
  foreignSubscriptions.events,
  ForeignMessage.Other(),
)
