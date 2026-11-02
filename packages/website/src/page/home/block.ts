import { Layer } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Animation } from '@foldkit/ui'

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

export const HomeLive = Home.toLayer(() => ({
  init: () => ({
    demoTabs: new DemoTabs('demoTabs', { id: 'demo-tabs' }),
    activeDemoTab: 'AsyncCounter',
    playgroundMenu: new PlaygroundMenu('playgroundMenu', {
      id: 'playground-menu',
      isAnimated: true,
    }),
    asyncCounterDemo: new AsyncCounterDemo('asyncCounterDemo'),
    notePlayerDemo: new NotePlayerDemo('notePlayerDemo'),
  }),

  update: {
    UpdatedNewsletterEmail: (model, { value }) => ({
      model,
      outMessage: OutMessage.UpdatedNewsletterEmail({ value }),
    }),
    ...DemoTabs.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, { activeDemoTab: () => value }),
      }),
    }),
    ...PlaygroundMenu.on({
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
})).pipe(
  Layer.provide(
    Layer.mergeAll(
      DemoTabs,
      PlaygroundMenu,
      AsyncCounterDemoLive,
      NotePlayerDemoLive,
    ),
  ),
  Layer.provide(Animation.AnimationLive),
)
