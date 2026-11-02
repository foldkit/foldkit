import { Effect } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  ApplicationBlock,
  Message,
  type Model,
  ReportCount,
} from './application'

const initialModel: Model = { count: 10, step: 1 }

describe('update', () => {
  describe('counting', () => {
    test('Ticked advances the count by the step and reports it on the outbound port', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(initialModel, { step: () => 3 })),
          message(Message.Ticked()),
          model(model => {
            expect(model.count).toBe(13)
          }),
          Command.expectHas(ReportCount),
          Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
      )
    })

    test('ClickedAdvance advances the count by the step and reports it', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ClickedAdvance()),
          model(model => {
            expect(model.count).toBe(11)
          }),
          Command.expectHas(ReportCount),
          Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
      )
    })
  })

  describe('host input', () => {
    test('ChangedStep stores the step pushed in by the host', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ChangedStep({ step: 7 })),
          model(model => {
            expect(model.step).toBe(7)
            expect(model.count).toBe(10)
          }),
          Command.expectNone(),
        ),
      )
    })

    test('a changed step applies from the next tick onward', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ChangedStep({ step: 5 })),
          message(Message.Ticked()),
          model(model => {
            expect(model.count).toBe(15)
          }),
          Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
      )
    })
  })
})
