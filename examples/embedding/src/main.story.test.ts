import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ChangedStep,
  ClickedAdvance,
  CompletedReportCount,
  type Model,
  ReportCount,
  Ticked,
  update,
} from './main'

const initialModel: Model = { count: 10, step: 1 }

describe('update', () => {
  describe('counting', () => {
    test('Ticked advances the count by the step and reports it on the outbound port', () => {
      Story.story(
        update,
        Story.with({ ...initialModel, step: 3 }),
        Story.message(Ticked()),
        Story.model(model => {
          expect(model.count).toBe(13)
        }),
        Story.Command.expectHas(ReportCount),
        Story.Command.resolve(ReportCount, CompletedReportCount()),
      )
    })

    test('ClickedAdvance advances the count by the step and reports it', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ClickedAdvance()),
        Story.model(model => {
          expect(model.count).toBe(11)
        }),
        Story.Command.expectHas(ReportCount),
        Story.Command.resolve(ReportCount, CompletedReportCount()),
      )
    })
  })

  describe('host input', () => {
    test('ChangedStep stores the step pushed in by the host', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedStep({ step: 7 })),
        Story.model(model => {
          expect(model.step).toBe(7)
          expect(model.count).toBe(10)
        }),
        Story.Command.expectNone(),
      )
    })

    test('a changed step applies from the next tick onward', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedStep({ step: 5 })),
        Story.message(Ticked()),
        Story.model(model => {
          expect(model.count).toBe(15)
        }),
        Story.Command.resolve(ReportCount, CompletedReportCount()),
      )
    })
  })
})
