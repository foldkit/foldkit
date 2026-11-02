import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Search } from './updateSearchContract'

export class Sidebar extends Block<Sidebar>()('Sidebar', {
  Model: Schema.Struct({
    search: Search,
    maybeLastTitle: Schema.Option(Schema.String),
  }),
  OutMessage: defineMessageUnion({ OpenedDocument: { title: Schema.String } }),
}) {}

export const SidebarLive = Sidebar.toLayer(() => ({
  init: () => ({
    search: new Search('search'),
    maybeLastTitle: Option.none(),
  }),

  update: {
    ...Search.on({
      ChoseResult: (model, { title }) => ({
        model: modifyFields(model, {
          maybeLastTitle: () => Option.some(title),
        }),
        outMessage: Sidebar.OutMessage.OpenedDocument({ title }),
      }),
    }),
  },

  view: (model, h) => h.aside([], [model.search.view()]),
}))
