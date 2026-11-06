import { Array, Effect, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Command from '../command/index.js'
import { createKeyedLazy } from '../html/index.js'
import type { Html, HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { Perf } from '../scene/public.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import {
  Command as SceneCommand,
  click,
  expect as expectView,
  given,
  role,
  scene,
  text,
} from './scene.js'

const Item = Schema.Struct({ id: Schema.String, label: Schema.String })
type Item = typeof Item.Type

type Model = Readonly<{
  items: ReadonlyArray<Item>
  selectedId: string | null
  loads: number
}>

const Filter = defineMessageUnion({ Cleared: {} })

const Message = defineMessageUnion({
  ClickedRow: { id: Schema.String },
  ClickedReverse: {},
  ClickedLoad: {},
  SucceededLoad: { count: Schema.Number },
  GotFilter: { message: Filter },
})
type Message = typeof Message.Type

const Load = Command.define('Load', {
  messages: [Message.SucceededLoad],
  execute: Effect.sync(() => Message.SucceededLoad({ count: 1 })),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedRow: ({ id }) => ({
      model: modifyFields(model, { selectedId: () => id }),
    }),
    ClickedReverse: () => ({
      model: modifyFields(model, { items: Array.reverse }),
    }),
    ClickedLoad: () => ({ model, commands: [Load()] }),
    SucceededLoad: ({ count }) => ({
      model: modifyFields(model, { loads: loads => loads + count }),
    }),
    GotFilter: () => ({
      model: modifyFields(model, { selectedId: () => null }),
    }),
  })

const rowView = (
  item: Item,
  isSelected: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    item.id,
    [
      h.Role('button'),
      h.Class(isSelected ? 'row selected' : 'row'),
      h.OnClick(Message.ClickedRow({ id: item.id })),
    ],
    [item.label],
  )

const makeView =
  (passFreshItem: boolean) =>
  (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.div(
      [],
      [
        h.span([h.Role('status')], [`loads: ${model.loads}`]),
        h.button(
          [h.OnClick(Message.ClickedReverse()), h.Role('button')],
          ['Reverse'],
        ),
        h.button(
          [h.OnClick(Message.ClickedLoad()), h.Role('button')],
          ['Load'],
        ),
        h.button(
          [
            h.OnClick(Message.GotFilter({ message: Filter.Cleared() })),
            h.Role('button'),
          ],
          ['Clear'],
        ),
        h.ul(
          [],
          model.items.map(item =>
            rows(item.id, rowView, [
              passFreshItem ? { ...item } : item,
              model.selectedId === item.id,
              h,
            ]),
          ),
        ),
      ],
    )
  }

const rows = createKeyedLazy('rows')
const view = makeView(false)

const model: Model = {
  items: [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Bravo' },
    { id: 'c', label: 'Charlie' },
  ],
  selectedId: null,
  loads: 0,
}

const capture = () => {
  const profiles: Array<Perf.Profile> = []
  return {
    record: (profile: Perf.Profile) => {
      profiles.push(profile)
    },
    only: (): Perf.Profile => {
      const [profile] = profiles
      expect(profiles).toHaveLength(1)
      if (profile === undefined) {
        throw new Error('no profile recorded')
      }
      return profile
    },
  }
}

describe('Perf.measure', () => {
  test('selecting a row re-renders only that row and patches one node', () => {
    const profiles = capture()
    scene(
      { update, view },
      given(model),
      Perf.measure(profiles.record, click(role('button', { name: 'Bravo' }))),
    )

    const { steps, total } = profiles.only()
    expect(steps).toHaveLength(1)
    expect(steps[0]?.messages).toEqual(['ClickedRow'])
    expect(total).toMatchObject({
      updates: 1,
      viewRenders: 1,
      vnodesBuilt: 12,
      lazyHits: 2,
      lazyMisses: 1,
      lazyInvalidations: 1,
      nodesCreated: 0,
      nodesRemoved: 0,
      nodesUpdated: 1,
      writes: 1,
    })
    expect(steps[0]?.lazyMisses).toEqual([
      {
        slotId: 1,
        label: 'rows',
        key: 'b',
        reason: 'ArgumentsChanged',
        changedArguments: [1],
      },
    ])
  })

  test('a lazy row skipped by reference counts as reused, not patched', () => {
    const profiles = capture()
    scene(
      { update, view },
      given(model),
      Perf.measure(profiles.record, click(role('button', { name: 'Bravo' }))),
    )

    expect(profiles.only().steps[0]?.diff).toMatchObject({
      reusedSubtrees: 2,
      reusedNodes: 4,
    })
  })

  test('reordering keyed rows reports moves without creating nodes', () => {
    const profiles = capture()
    scene(
      { update, view },
      given(model),
      Perf.measure(profiles.record, click(role('button', { name: 'Reverse' }))),
    )

    expect(profiles.only().total).toMatchObject({
      nodesCreated: 0,
      nodesRemoved: 0,
      lazyMisses: 0,
    })
    expect(profiles.only().total.nodesMoved).toBeGreaterThan(0)
  })

  test('steps that only assert are left out of the profile', () => {
    const profiles = capture()
    scene(
      { update, view },
      given(model),
      Perf.measure(
        profiles.record,
        expectView(text('Alpha')).toExist(),
        click(role('button', { name: 'Alpha' })),
        expectView(text('Alpha')).toExist(),
      ),
    )

    expect(Array.map(profiles.only().steps, ({ step }) => step)).toEqual([2])
  })

  test('a resolved Command counts as its own update step', () => {
    const profiles = capture()
    scene(
      { update, view },
      given(model),
      Perf.measure(
        profiles.record,
        click(role('button', { name: 'Load' })),
        SceneCommand.resolve(Load, Message.SucceededLoad({ count: 1 })),
      ),
    )

    expect(
      Array.map(profiles.only().steps, ({ messages }) => messages),
    ).toEqual([['ClickedLoad'], ['SucceededLoad']])
    expect(profiles.only().total.writes).toBe(1)
  })

  test('a wrapped Submodel message is named by its full tag path', () => {
    const profiles = capture()
    scene(
      { update, view },
      given({ ...model, selectedId: 'a' }),
      Perf.measure(profiles.record, click(role('button', { name: 'Clear' }))),
    )

    expect(profiles.only().steps[0]?.messages).toEqual(['GotFilter>Cleared'])
  })
})

describe('Perf.budget', () => {
  test('passes when the interaction stays inside the budget', () => {
    scene(
      { update, view },
      given(model),
      Perf.budget(
        { updates: 1, lazyMisses: 1, nodesChanged: 1 },
        click(role('button', { name: 'Bravo' })),
      ),
    )
  })

  test('names every lazy row that misses because an argument is rebuilt', () => {
    const unstableView = makeView(true)

    expect(() =>
      scene(
        { update, view: unstableView },
        given(model),
        Perf.budget(
          { lazyMisses: 1 },
          click(role('button', { name: 'Bravo' })),
        ),
      ),
    ).toThrow(
      /lazyMisses: 3 > 1[\s\S]*lazy #1 "rows": ArgumentsChanged \[0\] x2 \(key a, c\)[\s\S]*lazy #1 "rows": ArgumentsChanged \[0, 1\] \(key b\)/,
    )
  })

  test('leaves the scene usable after the measured block', () => {
    scene(
      { update, view },
      given(model),
      Perf.budget({ updates: 1 }, click(role('button', { name: 'Load' }))),
      SceneCommand.resolve(Load, Message.SucceededLoad({ count: 2 })),
      expectView(role('status')).toHaveText('loads: 2'),
    )
  })
})
