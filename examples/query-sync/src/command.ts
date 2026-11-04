import { Effect, Layer, Schema } from 'effect'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { ApplicationBlock } from './definition'
import { Message } from './message'
import { Diet, Period, Sorting, browseRouter } from './route'

export const ReplaceFilters = ApplicationBlock.makeCommand('ReplaceFilters', {
  args: {
    search: Schema.Option(Schema.String),
    sorting: Sorting,
    diet: Schema.Option(Diet),
    period: Schema.Option(Period),
  },
  messages: [Message.CompletedReplaceFilters],
  handler: function* () {
    return fields =>
      replaceUrl(browseRouter(fields)).pipe(
        Effect.as(Message.CompletedReplaceFilters()),
      )
  },
})

export const NavigateInternal = ApplicationBlock.makeCommand(
  'NavigateInternal',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateInternal],
    handler: function* () {
      return ({ url }) =>
        pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
    },
  },
)

export const LoadExternal = ApplicationBlock.makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const EffectsLayer = Layer.mergeAll(
  ReplaceFilters.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
)
