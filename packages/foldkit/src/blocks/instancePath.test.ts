import { Array, Effect, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import { message, model } from '../test/story.js'
import { Block } from './block.js'
import { story } from './testing.js'

class Ticker extends Block<Ticker>()('Ticker', {
  Model: Schema.Struct({ commandIdPrefix: Schema.String }),
}) {}

const TickerLive = Ticker.toLayer(() => ({
  init: (_, { path }) => ({ commandIdPrefix: Array.join(path, '/') }),
}))

class Tickers extends Block<Tickers>()('Tickers', {
  Model: Schema.Struct({ ticker: Ticker, tickers: Schema.Array(Ticker) }),
  Message: defineMessageUnion({ ClickedAdd: {} }),
}) {}

const TickersLive = Tickers.toLayer(() => ({
  init: () => ({ ticker: new Ticker('ticker'), tickers: [] }),
  update: {
    ClickedAdd: model => ({
      model: {
        ...model,
        tickers: Array.append(model.tickers, new Ticker('wo-42')),
      },
    }),
  },
}))

class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({ group: Tickers }),
}) {}

const BoardLive = Board.toLayer(() => ({
  init: () => ({ group: new Tickers('group') }),
}))

describe('Block instance path', () => {
  it.effect('gives init the path of the instance from the root', () =>
    story(
      TickersLive.pipe(Layer.provide(TickerLive)),
      message(Tickers.Message.ClickedAdd()),
      model(tickers => {
        expect(tickers.ticker.commandIdPrefix).toBe('ticker')
        expect(Array.map(tickers.tickers, row => row.commandIdPrefix)).toEqual([
          'wo-42',
        ])
      }),
    ),
  )

  it.effect('includes the ids of every ancestor below the root', () =>
    story(
      BoardLive.pipe(Layer.provide(TickersLive), Layer.provide(TickerLive)),
      model(board => {
        expect(board.group.ticker.commandIdPrefix).toBe('group/ticker')
      }),
    ),
  )
})

describe('Block stories', () => {
  it('names a child Block whose Layer is missing', () => {
    // @ts-expect-error MissingBlockLayer<Ticker>
    const missing: Effect.Effect<void> = story(TickersLive)
    expect(Effect.isEffect(missing)).toBe(true)
  })
})
