import { Array, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { createKeyedLazy } from '../html/index.js'
import type { Html, HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import { expectDomInSync } from './domSync.js'
import { given, scene, scroll, selector } from './scene.js'

type Model = Readonly<{ start: number }>

const Message = defineMessageUnion({
  ScrolledList: { scrollTop: Schema.Number },
})
type Message = typeof Message.Type

const ROW_HEIGHT = 10
const WINDOW = 6

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ScrolledList: ({ scrollTop }) => ({
      model: { ...model, start: Math.floor(scrollTop / ROW_HEIGHT) },
    }),
  })

const makeView = (isKeyed: boolean) => {
  const rows = createKeyedLazy('rows')
  const row = (index: number, top: number, h: HtmlBuilder<Message>): Html =>
    isKeyed
      ? h.keyed('div')(index, [h.Style({ top: `${top}px` })], [`row ${index}`])
      : h.div([h.Style({ top: `${top}px` })], [`row ${index}`])
  return (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
      [
        h.Class('scroller'),
        h.OnScroll(scrollTop => Message.ScrolledList({ scrollTop })),
      ],
      Array.makeBy(WINDOW, offset => {
        const index = model.start + offset
        return rows(index, row, [index, index * ROW_HEIGHT, h])
      }),
    )
}

const scrollBy = (rows: number) =>
  scroll(selector('.scroller'), { scrollTop: rows * ROW_HEIGHT })

describe('expectDomInSync', () => {
  test('catches lazy rows reused at a new position among unkeyed siblings', () => {
    expect(() =>
      scene(
        { update, view: makeView(false) },
        given({ start: 0 }),
        expectDomInSync(scrollBy(2), scrollBy(4)),
      ),
    ).toThrow(/no longer matches a fresh render after step 1[\s\S]*h\.keyed/)
  })

  test('passes when the same rows are keyed', () => {
    scene(
      { update, view: makeView(true) },
      given({ start: 0 }),
      expectDomInSync(scrollBy(2), scrollBy(4), scrollBy(1), scrollBy(9)),
    )
  })
})
