import { Effect, Option, Schema } from 'effect'
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

export const SidebarLive = Sidebar.make(
  Effect.fn(function* () {
    const search = yield* new Search('search')

    return {
      model: { search, maybeLastTitle: Option.none() },

      update: {
        ...search.on({
          ChoseResult: (model, { title }) => ({
            model: modifyFields(model, {
              maybeLastTitle: () => Option.some(title),
            }),
            outMessage: Sidebar.OutMessage.OpenedDocument({ title }),
          }),
        }),
      },

      view: (model, h) => h.aside([], [model.search.view()]),
    }
  }),
)
