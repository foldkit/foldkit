import { Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedCompute,
  ClickedStartEngine,
  ClickedStopEngine,
  Compute,
  ComputedSquare,
  EngineBooting,
  EngineFailed,
  EngineOff,
  EngineReady,
  FailedStartEngine,
  type Model,
  SkippedCompute,
  StartedEngine,
  update,
} from './main'

const offModel: Model = {
  engine: EngineOff(),
  computeCount: 0,
  lastResult: Option.none(),
}

const readyModel: Model = {
  engine: EngineReady({ engineId: 'engine-1' }),
  computeCount: 2,
  lastResult: Option.none(),
}

describe('update', () => {
  describe('engine lifecycle', () => {
    test('ClickedStartEngine requests the engine by entering EngineBooting', () => {
      Story.story(
        update,
        Story.with(offModel),
        Story.message(ClickedStartEngine()),
        Story.model(model => {
          expect(model.engine._tag).toBe('EngineBooting')
        }),
      )
    })

    test('StartedEngine marks the engine ready with its id', () => {
      Story.story(
        update,
        Story.with({ ...offModel, engine: EngineBooting() }),
        Story.message(StartedEngine({ engineId: 'engine-7' })),
        Story.model(model => {
          expect(model.engine).toStrictEqual(
            EngineReady({ engineId: 'engine-7' }),
          )
        }),
      )
    })

    test('ClickedStopEngine releases the engine by entering EngineOff', () => {
      Story.story(
        update,
        Story.with(readyModel),
        Story.message(ClickedStopEngine()),
        Story.model(model => {
          expect(model.engine._tag).toBe('EngineOff')
        }),
      )
    })

    test('FailedStartEngine records the failure reason', () => {
      Story.story(
        update,
        Story.with({ ...offModel, engine: EngineBooting() }),
        Story.message(FailedStartEngine({ reason: 'boot timeout' })),
        Story.model(model => {
          expect(model.engine).toStrictEqual(
            EngineFailed({ reason: 'boot timeout' }),
          )
        }),
      )
    })
  })

  describe('compute', () => {
    test('ClickedCompute increments the counter and fires Compute with the next value', () => {
      Story.story(
        update,
        Story.with(readyModel),
        Story.message(ClickedCompute()),
        Story.model(model => {
          expect(model.computeCount).toBe(3)
        }),
        Story.Command.expectExact(Compute({ value: 3 })),
        Story.Command.resolve(Compute, ComputedSquare({ result: 9 })),
        Story.model(model => {
          expect(model.lastResult).toStrictEqual(Option.some(9))
        }),
      )
    })

    test('SkippedCompute leaves the model unchanged', () => {
      Story.story(
        update,
        Story.with(readyModel),
        Story.message(SkippedCompute()),
        Story.model(model => {
          expect(model).toStrictEqual(readyModel)
        }),
      )
    })
  })
})
