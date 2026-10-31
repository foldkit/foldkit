// search.ts
import { Array, Effect, Option, Schema } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { Block, Command, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  SubmittedSearch: {},
  SucceededFetchResults: { results: Schema.Array(Schema.String) },
  FailedFetchResults: { error: Schema.String },
  ClickedResult: { result: Schema.String },
  CompletedFocusSearchInput: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedResult: { result: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

export const Model = Schema.Struct({
  query: Schema.String,
  results: Schema.Array(Schema.String),
  maybeError: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const FetchResults = Command.define('FetchResults', {
  args: { query: Schema.String },
  messages: [Message.SucceededFetchResults, Message.FailedFetchResults],
})

export const FocusSearchInput = Mount.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

export class Search extends Block<Search>()('Search', {
  Model,
  Message,
  OutMessage,
  Command: [FetchResults],
  Mount: [FocusSearchInput],
}) {}

const SearchResponse = Schema.Struct({ results: Schema.Array(Schema.String) })

type SearchViewBuilder = HtmlBuilder<
  Message,
  Mount.RequirementsOf<typeof FocusSearchInput>
>

const resultView = (result: string, h: SearchViewBuilder): Html =>
  h.keyed('li')(
    result,
    [h.OnClick(Message.ClickedResult({ result }))],
    [result],
  )

const view = (model: Model, h: SearchViewBuilder): Html =>
  h.div(
    [],
    [
      h.form(
        [h.OnSubmit(Message.SubmittedSearch())],
        [
          h.input([
            h.OnMount(FocusSearchInput()),
            h.Value(model.query),
            h.OnInput(value => Message.UpdatedQuery({ value })),
          ]),
        ],
      ),
      h.ul(
        [],
        Array.map(model.results, result => resultView(result, h)),
      ),
    ],
  )

export const SearchLive = Search.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { query: '', results: [], maybeError: Option.none() },
      update: {
        UpdatedQuery: (model, { value }) => ({
          model: modifyFields(model, { query: () => value }),
        }),
        SubmittedSearch: model => ({
          model,
          commands: [FetchResults({ query: model.query })],
        }),
        SucceededFetchResults: (model, { results }) => ({
          model: modifyFields(model, { results: () => results }),
        }),
        FailedFetchResults: (model, { error }) => ({
          model: modifyFields(model, { maybeError: () => Option.some(error) }),
        }),
        ClickedResult: (model, { result }) => ({
          model,
          outMessage: OutMessage.SelectedResult({ result }),
        }),
        CompletedFocusSearchInput: model => ({ model }),
      },
      commands: {
        FetchResults: ({ query }) =>
          client.get(`/api/search?q=${encodeURIComponent(query)}`).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(SearchResponse)),
            Effect.map(({ results }) =>
              Message.SucceededFetchResults({ results }),
            ),
            Effect.catch(() =>
              Effect.succeed(
                Message.FailedFetchResults({ error: 'Search failed' }),
              ),
            ),
          ),
      },
      mounts: {
        FocusSearchInput: ({ element }) =>
          Effect.sync(() => {
            if (element instanceof HTMLElement) {
              element.focus()
            }
          }).pipe(Effect.as(Message.CompletedFocusSearchInput())),
      },
      view,
    }
  }),
)
