import { Schema } from 'effect'
import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { AnimationStatus, Model, PanelState, init, update } from './main'
import { Message } from './message'

const hiddenModel = Model.make({ panel: PanelState.Hidden(), count: 0 })

describe('Model transitions', () => {
  test('I2 and I3: init and Message processing need no browser resources', () => {
    expect(init()).toEqual({ model: hiddenModel })
    story(
      update,
      given(hiddenModel),
      message(Message.ClickedShowPanel()),
      model(nextModel => {
        expect(nextModel).toEqual({
          panel: { _tag: 'Showing', animationStatus: { _tag: 'Running' } },
          count: 0,
        })
        expect(Schema.is(Model)(JSON.parse(JSON.stringify(nextModel)))).toBe(
          true,
        )
      }),
      message(Message.CompletedAnimatePanel()),
      model(nextModel =>
        expect(nextModel.panel).toEqual(
          PanelState.Showing({ animationStatus: AnimationStatus.Completed() }),
        ),
      ),
    )
  })

  test('completion and failure cannot alter a hidden panel', () => {
    story(
      update,
      given(hiddenModel),
      message(Message.CompletedAnimatePanel()),
      message(Message.FailedAnimatePanel({ error: 'late result' })),
      model(nextModel => expect(nextModel).toEqual(hiddenModel)),
    )
  })

  test('only a Running panel accepts its terminal result', () => {
    story(
      update,
      given(hiddenModel),
      message(Message.ClickedShowPanel()),
      message(Message.CompletedAnimatePanel()),
      message(Message.FailedAnimatePanel({ error: 'late failure' })),
      message(Message.ClickedShowPanel()),
      model(nextModel =>
        expect(nextModel.panel).toEqual(
          PanelState.Showing({ animationStatus: AnimationStatus.Completed() }),
        ),
      ),
    )
  })
})
