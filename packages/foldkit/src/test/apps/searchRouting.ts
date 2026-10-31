import { Effect, Option, Schema, pipe } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import * as Navigation from '../../navigation/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'
import * as Url from '../../url/index.js'

export const Model = Schema.Struct({
  query: Schema.String,
  requestedQuery: Schema.String,
  requestedUrl: Schema.String,
  activeSearchId: Schema.Number,
  results: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  TypedQuery: { query: Schema.String },
  ChangedUrl: { url: Url.Url },
  CompletedCancelSearch: {},
  CompletedReplaceSearchUrl: {},
  CompletedFetchSearch: {
    searchId: Schema.Number,
    results: Schema.Array(Schema.String),
  },
  CompletedObserveResults: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  RequestedSearch: { pathname: Schema.String },
  PresentedResults: { count: Schema.Number },
})
export type OutMessage = typeof OutMessage.Type

export const CancelSearch = Command.define('CancelSearch', {
  messages: [Message.CompletedCancelSearch],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedCancelSearch())
  },
})

export const ReplaceSearchUrl = Command.define('ReplaceSearchUrl', {
  args: { query: Schema.String },
  messages: [Message.CompletedReplaceSearchUrl],
  handler: function* () {
    return ({ query }) =>
      Navigation.replaceUrl(`/?q=${encodeURIComponent(query)}`).pipe(
        Effect.as(Message.CompletedReplaceSearchUrl()),
      )
  },
})

export const FetchSearch = Command.define('FetchSearch', {
  args: { searchId: Schema.Number, query: Schema.String },
  messages: [Message.CompletedFetchSearch],
  handler: function* () {
    return ({ searchId, query }) =>
      Effect.succeed(
        Message.CompletedFetchSearch({
          searchId,
          results: [`Result for ${query}`],
        }),
      )
  },
})

export const ObserveResults = Mount.define('ObserveResults', {
  messages: [Message.CompletedObserveResults],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedObserveResults())
  },
})

type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  | Command.HandlerOf<typeof CancelSearch>
  | Command.HandlerOf<typeof ReplaceSearchUrl>
  | Command.HandlerOf<typeof FetchSearch>
>

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    TypedQuery: ({ query }) => ({
      model: modifyFields(model, {
        query: () => query,
        activeSearchId: searchId => searchId + 1,
        results: () => [],
      }),
      commands: [CancelSearch(), ReplaceSearchUrl({ query })],
    }),
    ChangedUrl: ({ url }) => {
      const searchParams = new URLSearchParams(
        Option.getOrElse(url.search, () => ''),
      )
      const query = pipe(
        Option.fromNullishOr(searchParams.get('q')),
        Option.getOrElse(() => ''),
      )
      const searchId = model.activeSearchId + 1

      return {
        model: modifyFields(model, {
          requestedQuery: () => query,
          requestedUrl: () => Url.toString(url),
          activeSearchId: () => searchId,
          results: () => [],
        }),
        commands: query === '' ? [] : [FetchSearch({ searchId, query })],
        outMessage: OutMessage.RequestedSearch({ pathname: url.pathname }),
      }
    },
    CompletedCancelSearch: () => ({ model }),
    CompletedReplaceSearchUrl: () => ({ model }),
    CompletedFetchSearch: ({ searchId, results }) =>
      searchId === model.activeSearchId
        ? {
            model: modifyFields(model, { results: () => results }),
            outMessage: OutMessage.PresentedResults({ count: results.length }),
          }
        : { model },
    CompletedObserveResults: () => ({ model }),
  })

export const initialModel: Model = Model.make({
  query: '',
  requestedQuery: '',
  requestedUrl: '',
  activeSearchId: 0,
  results: [],
})

export const view = (
  model: Model,
  h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveResults>>,
): Html =>
  h.main(
    [],
    [
      h.label(
        [],
        [
          'Search',
          h.input([
            h.Role('textbox'),
            h.AriaLabel('Search'),
            h.Value(model.query),
            h.OnInput(query => Message.TypedQuery({ query })),
          ]),
        ],
      ),
      h.output([h.Role('status')], [model.results.join(', ') || 'No results']),
      h.output([h.AriaLabel('Requested URL')], [model.requestedUrl]),
      ...(model.requestedQuery === 'mount'
        ? [h.div([h.OnMount(ObserveResults())], ['Results loaded'])]
        : []),
    ],
  )
