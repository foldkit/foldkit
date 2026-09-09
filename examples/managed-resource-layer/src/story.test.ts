import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Compute, EngineState, Message, type Model, update } from './main'

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
    test('ClickedStartEngine requests the engine by entering Booting', () => {
      story(
        update,
        given(offModel),
        message(Message.ClickedStartEngine()),
        model(model => {
          expect(model.engine._tag).toBe('Booting')
        }),
      )
    })

    test('StartedEngine marks the engine ready with its id', () => {
      story(
        update,
        given(evo(offModel, { engine: () => EngineState.Booting() })),
        message(Message.StartedEngine({ engineId: 'engine-7' })),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Ready({ engineId: 'engine-7' }),
          )
        }),
      )
    })

    test('ClickedStopEngine releases the engine by entering Off', () => {
      story(
        update,
        given(readyModel),
        message(Message.ClickedStopEngine()),
        model(model => {
          expect(model.engine._tag).toBe('Off')
        }),
      )
    })

    test('StoppedEngine is a no-op lifecycle ack', () => {
      story(
        update,
        given(offModel),
        message(Message.StoppedEngine()),
        model(model => {
          expect(model).toStrictEqual(offModel)
        }),
      )
    })

    test('FailedStartEngine records the failure reason', () => {
      story(
        update,
        given(evo(offModel, { engine: () => EngineState.Booting() })),
        message(Message.FailedStartEngine({ reason: 'boot timeout' })),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Failed({ reason: 'boot timeout' }),
          )
        }),
      )
    })
  })

  describe('compute', () => {
    test('ClickedCompute increments the counter and fires Compute with the next value', () => {
      story(
        update,
        given(readyModel),
        message(Message.ClickedCompute()),
        model(model => {
          expect(model.computeCount).toBe(3)
        }),
        Command.expectExact(Compute({ value: 3 })),
        Command.resolve(Compute, Message.CompletedCompute({ result: 9 })),
        model(model => {
          expect(model.maybeSquareResult).toStrictEqual(Option.some(9))
        }),
      )
    })

    test('SkippedCompute leaves the model unchanged', () => {
      story(
        update,
        given(readyModel),
        message(Message.SkippedCompute()),
        model(model => {
          expect(model).toStrictEqual(readyModel)
        }),
      )
    })
  })
})
