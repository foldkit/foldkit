import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { AsyncCounterDemo, AsyncCounterDemoLive } from './asyncCounterDemo'
import { DemoTabs } from './demoTab'
import { Message, OutMessage } from './message'
import { Model } from './model'
import { NotePlayerDemo, NotePlayerDemoLive } from './notePlayerDemo'
import { PlaygroundMenu } from './playgroundMenu'
import { type ViewInputs, view } from './view'

export class Home extends Block<Home, void, ViewInputs>()('Home', {
  Model,
  Message,
  OutMessage,
}) {}

export const HomeLive = Home.make(
  Effect.fn(function* () {
    const demoTabs = yield* new DemoTabs('demoTabs', { id: 'demo-tabs' })
    const playgroundMenu = yield* new PlaygroundMenu('playgroundMenu', {
      id: 'playground-menu',
      isAnimated: true,
    })
    const asyncCounterDemo = yield* new AsyncCounterDemo('asyncCounterDemo')
    const notePlayerDemo = yield* new NotePlayerDemo('notePlayerDemo')

    return {
      model: {
        demoTabs,
        activeDemoTab: 'AsyncCounter',
        playgroundMenu,
        asyncCounterDemo,
        notePlayerDemo,
      },

      update: {
        UpdatedNewsletterEmail: (model, { value }) => ({
          model,
          outMessage: OutMessage.UpdatedNewsletterEmail({ value }),
        }),
        ...demoTabs.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { activeDemoTab: () => value }),
          }),
        }),
        ...playgroundMenu.on({
          Selected: (model, { value }) => ({
            model,
            outMessage: OutMessage.SelectedPlaygroundExample({
              exampleSlug: value,
            }),
          }),
          Closed: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      DemoTabs.Live,
      PlaygroundMenu.Live,
      AsyncCounterDemoLive,
      NotePlayerDemoLive,
    ),
  ),
)
