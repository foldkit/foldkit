import { Option } from 'effect'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { Compute, EngineState, Message } from './application'
import { application } from './application.fixture'
import { BootEngine, Engine } from './engine'

const startEngine = [
  message(Message.ClickedStartEngine()),
  Command.resolve(
    BootEngine,
    Engine.Message.SucceededBootEngine({ engineId: 'engine-1' }),
  ),
]

describe('update', () => {
  describe('engine lifecycle', () => {
    it.effect(
      'ClickedStartEngine requests the engine by entering Booting',
      () =>
        story(
          application,
          message(Message.ClickedStartEngine()),
          model(model => {
            expect(model.engine._tag).toBe('Booting')
            expect(Option.isSome(model.maybeComputeEngine)).toBe(true)
          }),
          Command.expectExact(BootEngine),
          Command.resolve(
            BootEngine,
            Engine.Message.SucceededBootEngine({ engineId: 'engine-1' }),
          ),
        ),
    )

    it.effect('a booted engine marks the engine ready with its id', () =>
      story(
        application,
        message(Message.ClickedStartEngine()),
        Command.resolve(
          BootEngine,
          Engine.Message.SucceededBootEngine({ engineId: 'engine-7' }),
        ),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Ready({ engineId: 'engine-7' }),
          )
        }),
      ),
    )

    it.effect('ClickedStopEngine releases the engine by entering Off', () =>
      story(
        application,
        ...startEngine,
        message(Message.ClickedStopEngine()),
        model(model => {
          expect(model.engine._tag).toBe('Off')
          expect(Option.isNone(model.maybeComputeEngine)).toBe(true)
        }),
      ),
    )

    it.effect('a failed boot records the failure reason', () =>
      story(
        application,
        message(Message.ClickedStartEngine()),
        Command.resolve(
          BootEngine,
          Engine.Message.FailedBootEngine({ reason: 'boot timeout' }),
        ),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Failed({ reason: 'boot timeout' }),
          )
          expect(Option.isNone(model.maybeComputeEngine)).toBe(true)
        }),
      ),
    )
  })

  describe('compute', () => {
    it.effect(
      'ClickedCompute increments the counter and fires Compute with the next value',
      () =>
        story(
          application,
          ...startEngine,
          message(Message.ClickedCompute()),
          model(model => {
            expect(model.computeCount).toBe(1)
          }),
          Command.expectExact(Compute({ value: 1 })),
          Command.resolve(Compute, Message.SucceededCompute({ result: 1 })),
          model(model => {
            expect(model.maybeSquareResult).toStrictEqual(Option.some(1))
          }),
        ),
    )

    it.effect('FailedCompute leaves the model unchanged', () =>
      story(
        application,
        ...startEngine,
        message(Message.FailedCompute()),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineState.Ready({ engineId: 'engine-1' }),
          )
          expect(model.maybeSquareResult).toStrictEqual(Option.none())
        }),
      ),
    )
  })
})
