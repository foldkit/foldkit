import { Array, Effect, HashMap, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import * as PreserveScheduler from './preserveScheduler.js'
import * as Program from './programPublic.js'
import { embed } from './start.js'

const originalMakePreserveScheduler = PreserveScheduler.makePreserveScheduler
const callbacks: Array<PreserveScheduler.PreserveSchedulerCallbacks<unknown>> =
  []

beforeEach(() => {
  callbacks.length = 0
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
  vi.spyOn(PreserveScheduler, 'makePreserveScheduler').mockImplementation(
    (preserveCallbacks, delay) => {
      callbacks.push(preserveCallbacks)
      return originalMakePreserveScheduler(preserveCallbacks, delay)
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Runtime Model preservation', () => {
  it('restores declared Date and HashMap values through the actual Runtime without repeating init', async () => {
    const Model = Schema.Struct({
      date: Schema.Date,
      values: Schema.HashMap(Schema.String, Schema.Number),
    })
    const Definition = Block.makeDefinition('DeclaredPreservation', {
      Model,
      Message: Schema.Never,
    })
    const Composition = Definition.makeComposition()
    const init = vi.fn(() => ({
      model: {
        date: new Date('2026-10-27T00:00:00.000Z'),
        values: HashMap.make(['one', 1]),
      },
    }))
    const renderedModels: Array<typeof Model.Type> = []
    const prepare = () =>
      Composition.prepareBlock({
        init: Composition.makeInit(() => init()),
        update: Composition.makeUpdate({}),
        view: Composition.makeView((model, h) => {
          renderedModels.push(model)
          return h.p([], [model.date.toISOString()])
        }),
      })
    const ApplicationBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    const container = document.createElement('div')
    container.id = 'declared-preservation'
    document.body.append(container)
    const send = vi
      .spyOn(ModelPreservationBridge, 'preserveModel')
      .mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handle = embed(
      Program.makeElement({
        block: ApplicationBlock,
        container,
        devTools: false,
      }),
    )

    try {
      await vi.waitFor(() => expect(renderedModels.length).toBe(1))
      const model = Option.getOrThrow(Array.head(renderedModels))
      Effect.runSync(Option.getOrThrow(Array.head(callbacks)).onFlush(model))
      const [, encoded] = Option.getOrThrow(Array.last(send.mock.calls))
      const wire: unknown = JSON.parse(JSON.stringify(encoded))
      expect(warn).not.toHaveBeenCalled()
      handle.dispose()
      vi.mocked(ModelPreservationBridge.resolvePreservedModel).mockReturnValue(
        Effect.succeed(wire),
      )

      const restoredContainer = document.createElement('div')
      restoredContainer.id = container.id
      document.body.append(restoredContainer)
      const restored = embed(
        Program.makeElement({
          block: ApplicationBlock,
          container: restoredContainer,
          devTools: false,
        }),
      )
      try {
        await vi.waitFor(() => expect(renderedModels.length).toBe(2))
        const restoredModel = Option.getOrThrow(Array.last(renderedModels))
        expect(restoredModel.date).toBeInstanceOf(Date)
        expect(restoredModel.date.toISOString()).toBe(model.date.toISOString())
        expect(HashMap.get(restoredModel.values, 'one')).toEqual(Option.some(1))
        expect(init).toHaveBeenCalledTimes(1)
      } finally {
        restored.dispose()
      }
    } finally {
      handle.dispose()
    }
  })

  it.each([
    ['Date', new Date('2026-10-27T00:00:00.000Z')],
    ['HashMap', HashMap.make(['one', 1])],
  ])(
    'invalidates stale preservation for an opaque %s snapshot without changing the live Model',
    async (_name, snapshot) => {
      const Model = Schema.Struct({
        maybeInspectedModel: Schema.Option(Schema.Unknown),
        count: Schema.Number,
      })
      const Message = defineMessageUnion({
        ClickedUnsupported: {},
        ClickedSupported: {},
      })
      const Definition = Block.makeDefinition('PreservedSnapshot', {
        Model,
        Message,
      })
      const Composition = Definition.makeComposition()
      const renderedModels: Array<typeof Model.Type> = []
      const prepare = () =>
        Composition.prepareBlock({
          init: Composition.makeInit(() => ({
            model: { maybeInspectedModel: Option.some('supported'), count: 0 },
          })),
          update: Composition.makeUpdate({
            ClickedUnsupported: Definition.makeFieldsStep(model => ({
              maybeInspectedModel: () => Option.some(snapshot),
              count: () => model.count + 1,
            })),
            ClickedSupported: Definition.makeFieldsStep(() => ({
              maybeInspectedModel: () => Option.some('supported'),
            })),
          }),
          view: Composition.makeView((model, h) => {
            renderedModels.push(model)
            return h.div(
              [],
              [
                h.button(
                  [h.OnClick(Message.ClickedUnsupported())],
                  ['Unsupported'],
                ),
                h.button(
                  [h.OnClick(Message.ClickedSupported())],
                  ['Supported'],
                ),
                h.p([], [globalThis.String(model.count)]),
              ],
            )
          }),
        })
      const ApplicationBlock: Block.FromAssemblyWithView<
        typeof Model,
        typeof prepare
      > = Block.assemble(prepare)
      const container = document.createElement('div')
      container.id = 'snapshot-preservation'
      document.body.append(container)
      const send = vi
        .spyOn(ModelPreservationBridge, 'preserveModel')
        .mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const handle = embed(
        Program.makeElement({
          block: ApplicationBlock,
          container,
          devTools: false,
          freezeModel: false,
        }),
      )

      try {
        await vi.waitFor(() =>
          expect(document.body.querySelectorAll('button')).toHaveLength(2),
        )
        expect(callbacks).toHaveLength(1)

        const preservation = Option.getOrThrow(Array.head(callbacks))
        const firstModel = Option.getOrThrow(Array.last(renderedModels))
        Effect.runSync(preservation.onDebounce(firstModel))
        expect(send).toHaveBeenLastCalledWith(
          container.id,
          Schema.encodeSync(Schema.toCodecJson(Model))(firstModel),
          false,
        )

        document.body.querySelector('button')?.click()
        await vi.waitFor(() =>
          expect(document.body.querySelector('p')?.textContent).toBe('1'),
        )
        const inspectedModel = Option.getOrThrow(Array.last(renderedModels))
        expect(Option.getOrThrow(inspectedModel.maybeInspectedModel)).toBe(
          snapshot,
        )
        expect(() =>
          Effect.runSync(preservation.onDebounce(inspectedModel)),
        ).not.toThrow()
        expect(send).toHaveBeenLastCalledWith(container.id, undefined, false)
        expect(() =>
          Effect.runSync(preservation.onFlush(inspectedModel)),
        ).not.toThrow()
        expect(send).toHaveBeenLastCalledWith(container.id, undefined, true)
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              expect.stringContaining('live Model is unchanged'),
            ]),
          ]),
        )
        expect(Option.getOrThrow(Array.last(renderedModels))).toBe(
          inspectedModel,
        )

        document.body.querySelectorAll('button').item(1)?.click()
        await vi.waitFor(() =>
          expect(
            Option.getOrThrow(
              Option.getOrThrow(Array.last(renderedModels)).maybeInspectedModel,
            ),
          ).toBe('supported'),
        )
        Effect.runSync(
          preservation.onFlush(Option.getOrThrow(Array.last(renderedModels))),
        )
        expect(send).toHaveBeenLastCalledWith(
          container.id,
          Schema.encodeSync(Schema.toCodecJson(Model))({
            maybeInspectedModel: Option.some('supported'),
            count: 1,
          }),
          true,
        )
        document.body.querySelector('button')?.click()
        await vi.waitFor(() =>
          expect(document.body.querySelector('p')?.textContent).toBe('2'),
        )
        Effect.runSync(
          preservation.onDebounce(
            Option.getOrThrow(Array.last(renderedModels)),
          ),
        )
        expect(warn).toHaveBeenCalledTimes(2)
      } finally {
        handle.dispose()
      }
    },
  )
})
