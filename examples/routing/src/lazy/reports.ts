import type { Runtime } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'

import { Message, type Model } from './contracts'
import { update } from './main'
import { shell } from './shell'

export const composition: Runtime.Composition<Model, Message> = {
  update,
  view: (model: Model, h: HtmlBuilder<Message>) => ({
    title: 'Reports | Foldkit',
    body: shell(h, [
      h.h1([], ['Reports loaded after boot']),
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button([h.OnClick(Message.ClickedHome())], ['Home']),
    ]),
  }),
}
