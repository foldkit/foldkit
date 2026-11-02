import { Layer } from 'effect'
import { Block } from 'foldkit'
import { message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Ticker, TickerLive } from './subscriptionTickerBlock'
import { AutoCounter, AutoCounterLive } from './subscriptionTickerParent'

it.effect('each tick increments the count while auto-counting', () =>
  story(
    AutoCounterLive.pipe(Layer.provide(TickerLive)),
    message(AutoCounter.Message.ClickedToggleAutoCount()),
    message(Block.deliver(Ticker, 'ticker', Ticker.Message.Ticked())),
    message(Block.deliver(Ticker, 'ticker', Ticker.Message.Ticked())),
    model(model => expect(model.count).toBe(2)),
  ),
)
