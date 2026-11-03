import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Compute,
  EngineState,
  Message,
  type Model,
} from './application'

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
        story(
          ApplicationBlock,
          given(offModel),
          message(Message.ClickedStartEngine()),
          model(model => {
            expect(model.engine._tag).toBe('Booting')
          }),
        ),
    )

    it.effect('StartedEngine marks the engine ready with its id', () =>
      story(
        ApplicationBlock,
        given(modifyFields(offModel, { engine: () => EngineState.Booting() })),
        message(Message.StartedEngine({ engineId: 'engine-7' })),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Ready({ engineId: 'engine-7' }),
          )
        }),
      ),
    )

    it.effect('ClickedStopEngine releases the engine by entering Off', () =>
      story(
        ApplicationBlock,
        given(readyModel),
        message(Message.ClickedStopEngine()),
        model(model => {
          expect(model.engine._tag).toBe('Off')
        }),
      ),
    )

    it.effect('StoppedEngine is a no-op lifecycle ack', () =>
      story(
        ApplicationBlock,
        given(offModel),
        message(Message.StoppedEngine()),
        model(model => {
          expect(model).toStrictEqual(offModel)
        }),
      ),
    )

    it.effect('FailedStartEngine records the failure reason', () =>
      story(
        ApplicationBlock,
        given(modifyFields(offModel, { engine: () => EngineState.Booting() })),
        message(Message.FailedStartEngine({ reason: 'boot timeout' })),
        model(model => {
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
        story(
          ApplicationBlock,
          given(readyModel),
          message(Message.ClickedCompute()),
          model(model => {
            expect(model.computeCount).toBe(3)
          }),
          Command.expectExact(Compute({ value: 3 })),
          Command.resolve(Compute, Message.SucceededCompute({ result: 9 })),
          model(model => {
            expect(model.maybeSquareResult).toStrictEqual(Option.some(9))
          }),
        ),
    )

    it.effect('FailedCompute leaves the model unchanged', () =>
      story(
        ApplicationBlock,
        given(readyModel),
        message(Message.FailedCompute()),
        model(model => {
          expect(model).toStrictEqual(readyModel)
        }),
      ),
    )
  })
})
