import { Array, Effect, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import { message, model } from '../test/story.js'
import { Block, deliver } from './block.js'
import { story } from './testing.js'

const ReaderMessage = defineMessageUnion({
  ClickedNext: {},
  CompletedRead: {},
})

class Reader extends Block<Reader>()('Reader', {
  Model: Schema.Struct({ page: Schema.Number, isLoaded: Schema.Boolean }),
  Message: ReaderMessage,
}) {}

const ReaderLive = Reader.make(
  Effect.fn(function* () {
    return {
      model: { page: 1, isLoaded: false },
      update: {
        ClickedNext: model => ({ model: { ...model, page: model.page + 1 } }),
        CompletedRead: model => ({ model: { ...model, isLoaded: true } }),
      },
      view: (_, h) => h.div([]),
    }
  }),
)

const Authority = Schema.Literals(['Checking', 'Confirmed'])

class Page extends Block<Page>()('Page', {
  Model: Schema.Struct({
    authority: Authority,
    reader: Reader,
    readers: Schema.Array(Reader),
  }),
  Message: defineMessageUnion({
    SucceededConfirmIdentity: {},
    ClickedAdvance: {},
    ClickedAddReader: {},
  }),
}) {}

const isAllowed = (
  authority: typeof Authority.Type,
  { _tag }: typeof ReaderMessage.Type,
): boolean => authority === 'Confirmed' || _tag === 'CompletedRead'

const PageLive = Page.make(
  Effect.fn(function* () {
    const reader = yield* new Reader('reader')
    const row = yield* Reader.each('readers')

    return {
      model: { authority: 'Checking', reader, readers: [] },
      update: {
        ...reader.when((model, readerMessage) =>
          isAllowed(model.authority, readerMessage),
        ),
        ...row.when((model, readerMessage) =>
          isAllowed(model.authority, readerMessage),
        ),
        SucceededConfirmIdentity: model => ({
          model: { ...model, authority: 'Confirmed' },
        }),
        ClickedAdvance: model => ({
          model,
          messages: [model.reader.send(Reader.Message.ClickedNext())],
        }),
        ClickedAddReader: model => ({
          model: { ...model, readers: Array.append(model.readers, row('a')) },
        }),
      },
      view: (_, h) => h.div([]),
    }
  }),
).pipe(Layer.provide(ReaderLive))

describe('Block when', () => {
  it.effect('drops the Messages the predicate refuses', () =>
    story(
      PageLive,
      message(deliver(Reader, 'reader', Reader.Message.ClickedNext())),
      message(deliver(Reader, 'reader', Reader.Message.CompletedRead())),
      model(page => {
        expect(page.reader.page).toBe(1)
        expect(page.reader.isLoaded).toBe(true)
      }),
      message(Page.Message.SucceededConfirmIdentity()),
      message(deliver(Reader, 'reader', Reader.Message.ClickedNext())),
      model(page => expect(page.reader.page).toBe(2)),
    ),
  )

  it.effect('passes Messages the parent sends', () =>
    story(
      PageLive,
      message(Page.Message.ClickedAdvance()),
      model(page => expect(page.reader.page).toBe(2)),
    ),
  )

  it.effect('gates every instance of a collection', () =>
    story(
      PageLive,
      message(Page.Message.ClickedAddReader()),
      message(deliver(Reader, ['readers', 'a'], Reader.Message.ClickedNext())),
      model(page =>
        expect(Array.map(page.readers, ({ page }) => page)).toEqual([1]),
      ),
      message(Page.Message.SucceededConfirmIdentity()),
      message(deliver(Reader, ['readers', 'a'], Reader.Message.ClickedNext())),
      model(page =>
        expect(Array.map(page.readers, ({ page }) => page)).toEqual([2]),
      ),
    ),
  )
})
