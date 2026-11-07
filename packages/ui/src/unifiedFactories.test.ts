import {
  Cause,
  Context,
  Effect,
  Exit,
  Layer,
  Schema,
  SchemaTransformation,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Combobox from './combobox/public.js'

const Fruit = Schema.Literals(['Apple', 'Pear'])
const Picker = Combobox.makeBlock(Fruit)
const MultiPicker = Combobox.Multi.makeBlock(Fruit)
const EncodedItem = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
const EncodedPicker = Combobox.makeBlock(EncodedItem)
class Construction extends Context.Service<
  Construction,
  Readonly<{ isUnavailable: boolean }>
>()('UiUnifiedFactoryTest/Construction') {}
const ConstructionError = Schema.Struct({ reason: Schema.String })
const ParentKey = Symbol('UiUnifiedFactoryTest')
const UiUnifiedFactoryTestBlock = Block.make('UiUnifiedFactoryTest', {
  key: ParentKey,
  Model: Schema.Struct({ picker: Picker.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const PickerBinding = UiUnifiedFactoryTestBlock.makeRequiredFieldBinding(
  Picker,
  {
    field: 'picker',
    init: { contextToArgs: () => [{ id: 'deferred-picker' }] },
  },
).withOutMessagePolicy({
  fold: UiUnifiedFactoryTestBlock.makeOutMessageFold(Picker, {
    Selected: () => UiUnifiedFactoryTestBlock.makeNoopStep(),
    ClearedSelection: () => UiUnifiedFactoryTestBlock.makeNoopStep(),
  }),
})
const UiUnifiedFactoryTestComposition =
  UiUnifiedFactoryTestBlock.makeComposition({ bindings: [PickerBinding] })
const init = UiUnifiedFactoryTestComposition.makeInit(() => ({ model: {} }))
const update = UiUnifiedFactoryTestComposition.makeUpdate({})
const makeParentLayer = (events: Array<string>) =>
  UiUnifiedFactoryTestBlock.makeLayer(
    Effect.gen(function* () {
      const construction = yield* Construction

      if (construction.isUnavailable) {
        return yield* Effect.fail(
          ConstructionError.make({ reason: 'constructor unavailable' }),
        )
      }

      yield* Effect.acquireRelease(
        Effect.sync(() => events.push('acquire')),
        () => Effect.sync(() => events.push('release')),
      )
      const picker = yield* PickerBinding

      return { children: [picker], init, update }
    }),
  ).pipe(Layer.provide(Combobox.layer))

describe('unified UI factories', () => {
  it('retains exact runtime Item Codecs without an executable getter', () => {
    for (const block of [Picker, MultiPicker, EncodedPicker]) {
      expect('get' in block).toBe(false)
      expect('contract' in block).toBe(false)
      expect('makeBlock' in block).toBe(false)
      expect('init' in block).toBe(false)
      expect(typeof block.makeLayer).toBe('function')
    }

    const selected = EncodedPicker.Message.SelectedItem({
      item: '42',
      displayText: 'Forty two',
      wasSelected: false,
    })
    expect(
      Schema.encodeSync(EncodedPicker.Message.SelectedItem)(selected).item,
    ).toBe(42)
    expect(() =>
      Schema.decodeUnknownSync(Picker.Message.SelectedItem)({
        _tag: 'SelectedItem',
        item: 'Orange',
        displayText: 'Orange',
        wasSelected: false,
      }),
    ).toThrow()
  })

  it.effect(
    'acquires the declared Schema specialization for ordinary pure Stories',
    () =>
      Story.withBlock(Picker, executable => {
        const initial = executable.init({ id: 'single' })
        const selected = executable.operations.requestSelectItem(
          initial.model,
          'Apple',
          'Apple',
        )

        expect(selected.outMessage).toEqual(
          Picker.OutMessage.Selected({ value: 'Apple' }),
        )
      }).pipe(Effect.provide(Combobox.layer)),
  )

  it.effect(
    'keeps construction passive and releases the selected graph after its Story',
    () =>
      Effect.gen(function* () {
        const events: Array<string> = []
        const layer = makeParentLayer(events)
        expect(events).toEqual([])

        yield* Story.withBlock(
          { block: UiUnifiedFactoryTestBlock, layer },
          executable => {
            expect(events).toEqual(['acquire'])
            expect(executable.init().model.picker.id).toBe('deferred-picker')
          },
        ).pipe(Effect.provideService(Construction, { isUnavailable: false }))

        expect(events).toEqual(['acquire', 'release'])
      }),
  )

  it.effect(
    'retains graph constructor failures without acquiring a resource',
    () =>
      Effect.gen(function* () {
        const events: Array<string> = []
        const failure = yield* Effect.exit(
          Story.withBlock(
            {
              block: UiUnifiedFactoryTestBlock,
              layer: makeParentLayer(events),
            },
            executable => executable.init(),
          ).pipe(Effect.provideService(Construction, { isUnavailable: true })),
        )

        expect(Exit.isFailure(failure)).toBe(true)
        if (Exit.isFailure(failure)) {
          expect(Cause.pretty(failure.cause)).toContain(
            'constructor unavailable',
          )
        }

        expect(events).toEqual([])
      }),
  )
})
