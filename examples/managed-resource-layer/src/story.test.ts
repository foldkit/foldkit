import { Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Compute,
  EngineState,
  Message,
  type Model,
  layer,
} from './block'

const offModel: Model = {
  engine: EngineState.Off(),
  computeCount: 0,
  maybeSquareResult: Option.none(),
}

const readyModel: Model = {
  engine: EngineState.Ready({ engineId: 'engine-1' }),
  computeCount: 2,
  maybeSquareResult: Option.none(),
}

describe('update', () => {
  describe('engine lifecycle', () => {
    it.effect(
      'ClickedStartEngine requests the engine by entering Booting',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(offModel),
          Story.message(Message.ClickedStartEngine()),
          Story.model(model => {
            expect(model.engine._tag).toBe('Booting')
          }),
        ),
    )

    it.effect('StartedEngine marks the engine ready with its id', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(offModel, { engine: () => EngineState.Booting() }),
        ),
        Story.message(Message.StartedEngine({ engineId: 'engine-7' })),
        Story.model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Ready({ engineId: 'engine-7' }),
          )
        }),
      ),
    )

    it.effect('ClickedStopEngine releases the engine by entering Off', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(readyModel),
        Story.message(Message.ClickedStopEngine()),
        Story.model(model => {
          expect(model.engine._tag).toBe('Off')
        }),
      ),
    )

    it.effect('StoppedEngine is a no-op lifecycle ack', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(offModel),
        Story.message(Message.StoppedEngine()),
        Story.model(model => {
          expect(model).toStrictEqual(offModel)
        }),
      ),
    )

    it.effect('FailedStartEngine records the failure reason', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(offModel, { engine: () => EngineState.Booting() }),
        ),
        Story.message(Message.FailedStartEngine({ reason: 'boot timeout' })),
        Story.model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Failed({ reason: 'boot timeout' }),
          )
        }),
      ),
    )
  })

  describe('compute', () => {
    it.effect(
      'ClickedCompute increments the counter and fires Compute with the next value',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(readyModel),
          Story.message(Message.ClickedCompute()),
          Story.model(model => {
            expect(model.computeCount).toBe(3)
          }),
          Story.Command.expectExact(Compute({ value: 3 })),
          Story.Command.resolve(
            Compute,
            Message.SucceededCompute({ result: 9 }),
          ),
          Story.model(model => {
            expect(model.maybeSquareResult).toStrictEqual(Option.some(9))
          }),
        ),
    )

    it.effect('FailedCompute leaves the model unchanged', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(readyModel),
        Story.message(Message.FailedCompute()),
        Story.model(model => {
          expect(model).toStrictEqual(readyModel)
        }),
      ),
    )
  })
})
