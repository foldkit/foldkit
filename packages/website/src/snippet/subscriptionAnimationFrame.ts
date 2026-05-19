import { Schema as S } from 'effect'
import { Subscription } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const TickedFrame = m('TickedFrame', { deltaTime: S.Number })
const ClickedTogglePlay = m('ClickedTogglePlay')

const Message = S.Union([TickedFrame, ClickedTogglePlay])
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  isPlaying: S.Boolean,
  angle: S.Number,
})

type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  frame: Subscription.animationFrame({
    isActive: model => model.isPlaying,
    toMessage: deltaTime => TickedFrame({ deltaTime }),
  }),
}))
