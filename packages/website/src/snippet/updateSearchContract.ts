import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  query: Schema.String,
  page: Schema.Number,
  results: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type

export class Catalog extends Context.Service<
  Catalog,
  Readonly<{
    search: (
      query: string,
      page: number,
    ) => Effect.Effect<ReadonlyArray<string>, Error>
  }>
>()('Catalog') {}

const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  ClickedClear: {},
  ClickedResult: { title: Schema.String },
  SucceededSearch: { results: Schema.Array(Schema.String) },
  FailedSearch: {},
})

export const SearchCatalog = Command.define('SearchCatalog', {
  args: { query: Schema.String, page: Schema.Number },
  messages: [Message.SucceededSearch, Message.FailedSearch],
})

export class Search extends Block<Search>()('Search', {
  Model,
  Message,
  OutMessage: defineMessageUnion({ ChoseResult: { title: Schema.String } }),
  Command: [SearchCatalog],
}) {}
