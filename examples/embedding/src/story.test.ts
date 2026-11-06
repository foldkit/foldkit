import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  type Model,
  ReportCount,
  layer,
} from './block'

const initialModel: Model = { count: 10, step: 1 }

describe('update', () => {
  describe('counting', () => {
    it.effect(
      'Ticked advances the count by the step and reports it on the outbound port',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(modifyFields(initialModel, { step: () => 3 })),
          Story.message(Message.Ticked()),
          Story.model(model => {
            expect(model.count).toBe(13)
          }),
          Story.Command.expectHas(ReportCount),
          Story.Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
    )

    it.effect(
      'ClickedAdvance advances the count by the step and reports it',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.ClickedAdvance()),
          Story.model(model => {
            expect(model.count).toBe(11)
          }),
          Story.Command.expectHas(ReportCount),
          Story.Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
    )
  })

  describe('host input', () => {
    it.effect('ChangedStep stores the step pushed in by the host', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedStep({ step: 7 })),
        Story.model(model => {
          expect(model.step).toBe(7)
          expect(model.count).toBe(10)
        }),
        Story.Command.expectNone(),
      ),
    )

    it.effect('a changed step applies from the next tick onward', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedStep({ step: 5 })),
        Story.message(Message.Ticked()),
        Story.model(model => {
          expect(model.count).toBe(15)
        }),
        Story.Command.resolve(ReportCount, Message.CompletedReportCount()),
      ),
    )
  })
})
