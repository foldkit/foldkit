import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ query: Schema.String })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
})
type Message = typeof Message.Type

// ❌ Bad
// The class name and Layer name drift from the Block id 'Search'.
export class SearchBox extends Block<SearchBox>()('Search', {
  Model,
  Message,
}) {}

export const searchLayer = SearchBox.make(
  Effect.fn(function* () {
    return {
      model: { query: '' },
      update: {
        UpdatedQuery: (_model, { value }) => ({ model: { query: value } }),
      },
    }
  }),
)

// ✅ Good
// The class carries the Block id, and its Layer adds Live.
export class Search extends Block<Search>()('Search', { Model, Message }) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    return {
      model: { query: '' },
      update: {
        UpdatedQuery: (_model, { value }) => ({ model: { query: value } }),
      },
    }
  }),
)
