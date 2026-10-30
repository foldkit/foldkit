import { Array, Duration, Effect, HashMap, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Block } from '../blocks/block.js'
import * as Engine from '../blocks/engine.js'
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
    preserveCallbacks => {
      callbacks.push(preserveCallbacks)
      return originalMakePreserveScheduler(preserveCallbacks, Duration.hours(1))
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const latestRoot = (renderRoot: {
  mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> }
}): unknown =>
  Option.getOrThrow(
    Option.flatMap(Array.last(renderRoot.mock.calls), call =>
      Array.get(call, 1),
    ),
  )

const preservedPayload = (
  id: string,
  ModelSchema: Schema.Codec<any, any>,
  model: unknown,
): unknown => ({
  flags: null,
  root: {
    id,
    path: [],
    model: Schema.encodeSync(Schema.toCodecJson(ModelSchema))(model),
  },
})

describe('Runtime Model preservation', () => {
  it('restores declared Date and HashMap values through the actual Runtime without repeating construction', async () => {
    const Model = Schema.Struct({
      date: Schema.Date,
      values: Schema.HashMap(Schema.String, Schema.Number),
    })
    type Model = typeof Model.Type
    class DeclaredPreservation extends Block<DeclaredPreservation>()(
      'DeclaredPreservation',
      { Model },
    ) {}
    const construct = vi.fn(() => ({
      date: new Date('2026-10-27T00:00:00.000Z'),
      values: HashMap.make(['one', 1]),
    }))
    const renderedModels: Array<Model> = []
    const DeclaredPreservationLive = DeclaredPreservation.make(
      Effect.fn(function* () {
        return {
          model: construct(),
          view: (model, h) => {
            renderedModels.push(model)
            return h.p([], [model.date.toISOString()])
          },
        }
      }),
    )
    const renderRoot = vi.spyOn(Engine, 'renderRoot')
    const container = document.createElement('div')
    container.id = 'declared-preservation'
    document.body.append(container)
    const send = vi
      .spyOn(ModelPreservationBridge, 'preserveModel')
      .mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handle = embed(
      Program.makeElement(DeclaredPreservation, {
        layer: DeclaredPreservationLive,
        container,
      }),
    )

    try {
      await vi.waitFor(() => expect(renderedModels.length).toBe(1))
      const model = Option.getOrThrow(Array.head(renderedModels))
      Effect.runSync(
        Option.getOrThrow(Array.head(callbacks)).onFlush(
          latestRoot(renderRoot),
        ),
      )
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
        Program.makeElement(DeclaredPreservation, {
          layer: DeclaredPreservationLive,
          container: restoredContainer,
        }),
      )
      try {
        await vi.waitFor(() => expect(renderedModels.length).toBe(2))
        const restoredModel = Option.getOrThrow(Array.last(renderedModels))
        expect(restoredModel.date).toBeInstanceOf(Date)
        expect(restoredModel.date.toISOString()).toBe(model.date.toISOString())
        expect(HashMap.get(restoredModel.values, 'one')).toEqual(Option.some(1))
        expect(restoredModel).not.toBe(model)
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
      type Model = typeof Model.Type
      const Message = defineMessageUnion({
        ClickedUnsupported: {},
        ClickedSupported: {},
      })
      class PreservedSnapshot extends Block<PreservedSnapshot>()(
        'PreservedSnapshot',
        { Model, Message },
      ) {}
      const renderedModels: Array<Model> = []
      const PreservedSnapshotLive = PreservedSnapshot.make(
        Effect.fn(function* () {
          return {
            model: { maybeInspectedModel: Option.some('supported'), count: 0 },
            update: {
              ClickedUnsupported: model => ({
                model: {
                  maybeInspectedModel: Option.some(snapshot),
                  count: model.count + 1,
                },
              }),
              ClickedSupported: model => ({
                model: {
                  ...model,
                  maybeInspectedModel: Option.some('supported'),
                },
              }),
            },
            view: (model, h) => {
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
            },
          }
        }),
      )
      const renderRoot = vi.spyOn(Engine, 'renderRoot')
      const container = document.createElement('div')
      container.id = 'snapshot-preservation'
      document.body.append(container)
      const send = vi
        .spyOn(ModelPreservationBridge, 'preserveModel')
        .mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const handle = embed(
        Program.makeElement(PreservedSnapshot, {
          layer: PreservedSnapshotLive,
          container,
        }),
      )

      try {
        await vi.waitFor(() =>
          expect(document.body.querySelectorAll('button')).toHaveLength(2),
        )
        expect(callbacks).toHaveLength(1)

        const preservation = Option.getOrThrow(Array.head(callbacks))
        const firstModel = Option.getOrThrow(Array.last(renderedModels))
        Effect.runSync(preservation.onDebounce(latestRoot(renderRoot)))
        expect(send).toHaveBeenLastCalledWith(
          container.id,
          preservedPayload('PreservedSnapshot', Model, firstModel),
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
        const inspectedRoot = latestRoot(renderRoot)
        expect(() =>
          Effect.runSync(preservation.onDebounce(inspectedRoot)),
        ).not.toThrow()
        expect(send).toHaveBeenLastCalledWith(container.id, undefined, false)
        expect(() =>
          Effect.runSync(preservation.onFlush(inspectedRoot)),
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
        Effect.runSync(preservation.onFlush(latestRoot(renderRoot)))
        expect(send).toHaveBeenLastCalledWith(
          container.id,
          preservedPayload('PreservedSnapshot', Model, {
            maybeInspectedModel: Option.some('supported'),
            count: 1,
          }),
          true,
        )
        document.body.querySelector('button')?.click()
        await vi.waitFor(() =>
          expect(document.body.querySelector('p')?.textContent).toBe('2'),
        )
        Effect.runSync(preservation.onDebounce(latestRoot(renderRoot)))
        expect(warn).toHaveBeenCalledTimes(2)
      } finally {
        handle.dispose()
      }
    },
  )
})
