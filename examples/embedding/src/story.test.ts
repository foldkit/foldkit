import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  type Model,
  ReportCount,
  layer,
} from './application'

const initialModel: Model = { count: 10, step: 1 }

describe('update', () => {
  describe('counting', () => {
    it.effect(
      'Ticked advances the count by the step and reports it on the outbound port',
      () =>
        story(
          { block: ApplicationBlock, layer },
          given(modifyFields(initialModel, { step: () => 3 })),
          message(Message.Ticked()),
          model(model => {
            expect(model.count).toBe(13)
          }),
          Command.expectHas(ReportCount),
          Command.resolve(ReportCount, Message.CompletedReportCount()),
        ),
    )

    it.effect(
      'ClickedAdvance advances the count by the step and reports it',
      () =>
        story(
          { block: ApplicationBlock, layer },
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

  describe('host input', () => {
    it.effect('ChangedStep stores the step pushed in by the host', () =>
      story(
        { block: ApplicationBlock, layer },
        given(initialModel),
        message(Message.ChangedStep({ step: 7 })),
        model(model => {
          expect(model.step).toBe(7)
          expect(model.count).toBe(10)
        }),
        Command.expectNone(),
      ),
    )

    it.effect('a changed step applies from the next tick onward', () =>
      story(
        { block: ApplicationBlock, layer },
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
