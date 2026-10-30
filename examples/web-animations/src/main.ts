import { Schema } from 'effect'
import { type Runtime, type Update } from 'foldkit'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { Message } from './message'
import { AnimatePanel } from './mount'

// MODEL

export const AnimationStatus = defineTaggedUnion({
  Running: {},
  Completed: {},
  Failed: { error: Schema.String },
})

export const PanelState = defineTaggedUnion({
  Hidden: {},
  Showing: { animationStatus: AnimationStatus },
})

export const Model = Schema.Struct({ panel: PanelState, count: Schema.Number })
export type Model = typeof Model.Type

// UPDATE

const completeAnimation = (
  model: Model,
  animationStatus: typeof AnimationStatus.Type,
): Model => {
  if (
    model.panel._tag !== 'Showing' ||
    model.panel.animationStatus._tag !== 'Running'
  ) {
    return model
  }

  const nextPanel = PanelState.Showing({ animationStatus })
  return modifyFields(model, { panel: () => nextPanel })
}

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedShowPanel: () => {
      if (model.panel._tag !== 'Hidden') {
        return { model }
      }

      const nextPanel = PanelState.Showing({
        animationStatus: AnimationStatus.Running(),
      })
      return { model: modifyFields(model, { panel: () => nextPanel }) }
    },
    ClickedHidePanel: () => ({
      model: modifyFields(model, { panel: () => PanelState.Hidden() }),
    }),
    ClickedIncrementCounter: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
    CompletedAnimatePanel: () => ({
      model: completeAnimation(model, AnimationStatus.Completed()),
    }),
    FailedAnimatePanel: ({ error }) => ({
      model: completeAnimation(model, AnimationStatus.Failed({ error })),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: Model.make({ panel: PanelState.Hidden(), count: 0 }),
})

// VIEW

const panelView = (h: HtmlBuilder<Message>): Html =>
  h.section(
    [
      h.Class('panel'),
      h.AriaLabel('Animated panel'),
      h.OnMount(AnimatePanel()),
    ],
    [
      h.h2([], ['A native entrance']),
      h.p(
        [],
        [
          'The browser interpolates opacity and position. Foldkit owns this element’s lifetime.',
        ],
      ),
    ],
  )

const buttonView = (
  label: string,
  message: Message,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick: message,
      toView: attributes => h.button(attributes.button, [label]),
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Web Animations',
  body: h.main(
    [h.Class('demo')],
    [
      h.p([h.Class('eyebrow')], ['Foldkit · Web Animations']),
      h.h1([], ['An entrance with a lifetime']),
      h.p(
        [],
        [
          'Show the panel to animate it. Hide it during playback to cancel its animation.',
        ],
      ),
      h.div(
        [h.Class('controls')],
        [
          PanelState.match(model.panel, {
            Hidden: () =>
              buttonView('Show panel', Message.ClickedShowPanel(), h),
            Showing: () =>
              buttonView('Hide panel', Message.ClickedHidePanel(), h),
          }),
          buttonView('Increment counter', Message.ClickedIncrementCounter(), h),
        ],
      ),
      h.p([], [`Counter: ${model.count}`]),
      h.p(
        [h.Role('status')],
        [
          PanelState.match(model.panel, {
            Hidden: () => 'Hidden',
            Showing: ({ animationStatus }) =>
              AnimationStatus.match(animationStatus, {
                Running: () => 'Running',
                Completed: () => 'Completed',
                Failed: ({ error }) => `Failed: ${error}`,
              }),
          }),
        ],
      ),
      PanelState.match(model.panel, {
        Hidden: () => h.div([h.Class('placeholder')]),
        Showing: () => panelView(h),
      }),
      h.p(
        [h.Class('note')],
        [
          'DevTools historical inspection pauses unfinished playback. Returning live resumes it; historical Models do not reconstruct an exact animation pose. The live application continues running.',
        ],
      ),
    ],
  ),
})
