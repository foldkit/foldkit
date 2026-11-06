import { Option, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import type { Html, HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import {
  expect as expectView,
  given,
  hover,
  role,
  scene,
  scroll,
  selector,
  unhover,
} from './scene.js'

type Model = Readonly<{
  hovered: string | null
  pointerType: string | null
  scrollTop: number
}>

const Message = defineMessageUnion({
  EnteredItem: { id: Schema.String },
  LeftItem: {},
  LeftPointerItem: { pointerType: Schema.String },
  ScrolledList: { scrollTop: Schema.Number },
})
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    EnteredItem: ({ id }) => ({ model: { ...model, hovered: id } }),
    LeftItem: () => ({ model: { ...model, hovered: null } }),
    LeftPointerItem: ({ pointerType }) => ({
      model: { ...model, hovered: null, pointerType },
    }),
    ScrolledList: ({ scrollTop }) => ({ model: { ...model, scrollTop } }),
  })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.span([h.Role('status')], [`hovered: ${model.hovered ?? 'none'}`]),
      h.span([h.Role('note')], [`pointer: ${model.pointerType ?? 'none'}`]),
      h.div(
        [
          h.Role('list'),
          h.Attribute('class', 'overflow-auto list'),
          h.OnScroll(scrollTop => Message.ScrolledList({ scrollTop })),
        ],
        [
          h.div(
            [
              h.Role('listitem'),
              h.AriaLabel('mouse'),
              h.OnMouseEnter(Message.EnteredItem({ id: 'mouse' })),
              h.OnMouseLeave(Message.LeftItem()),
            ],
            ['Mouse'],
          ),
          h.div(
            [
              h.Role('listitem'),
              h.AriaLabel('pointer'),
              h.OnMouseEnter(Message.EnteredItem({ id: 'pointer' })),
              h.OnPointerLeave(pointerType =>
                Option.some(Message.LeftPointerItem({ pointerType })),
              ),
            ],
            ['Pointer'],
          ),
          h.div([h.Role('listitem'), h.AriaLabel('inert')], ['No handlers']),
        ],
      ),
      h.span([h.Role('log')], [`scrollTop: ${model.scrollTop}`]),
    ],
  )

const model: Model = { hovered: null, pointerType: null, scrollTop: 0 }

describe('unhover', () => {
  test('fires the mouseleave handler after a hover', () => {
    scene(
      { update, view },
      given(model),
      hover(role('listitem', { name: 'mouse' })),
      expectView(role('status')).toHaveText('hovered: mouse'),
      unhover(role('listitem', { name: 'mouse' })),
      expectView(role('status')).toHaveText('hovered: none'),
    )
  })

  test('falls back to pointerleave and passes the pointer type', () => {
    scene(
      { update, view },
      given(model),
      hover(role('listitem', { name: 'pointer' })),
      unhover(role('listitem', { name: 'pointer' }), { pointerType: 'pen' }),
      expectView(role('status')).toHaveText('hovered: none'),
      expectView(role('note')).toHaveText('pointer: pen'),
    )
  })

  test('names the missing handler when the element has none', () => {
    expect(() =>
      scene(
        { update, view },
        given(model),
        unhover(role('listitem', { name: 'inert' })),
      ),
    ).toThrow(/no mouseleave handler[\s\S]*OnMouseLeave/)
  })
})

describe('scroll', () => {
  test('passes the scroll position to the OnScroll callback', () => {
    scene(
      { update, view },
      given(model),
      scroll(role('list'), { scrollTop: 480 }),
      expectView(role('log')).toHaveText('scrollTop: 480'),
    )
  })

  test('finds the scroller by a class set through h.Attribute', () => {
    scene(
      { update, view },
      given(model),
      scroll(selector('.overflow-auto'), { scrollTop: 96 }),
      expectView(role('log')).toHaveText('scrollTop: 96'),
    )
  })
})
