import { Layer } from 'effect'
import { Duration, Effect, Schema } from 'effect'
import { load, pushUrl } from 'foldkit/navigation'

import { Application } from './definition'
import { Message } from './message'

const CATALOG_LATENCY = Duration.millis(600)
const PAINTING_LATENCY = Duration.millis(400)
const SAVE_LATENCY = Duration.millis(300)

export const NavigateInternal = Application.command('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  handler: function* () {
    return ({ url }) =>
      pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
  },
})

export const LoadExternal = Application.command('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const LoadCatalog = Application.command('LoadCatalog', {
  messages: [Message.CompletedLoadCatalog],
  handler: function* () {
    return () =>
      Effect.sleep(CATALOG_LATENCY).pipe(
        Effect.as(Message.CompletedLoadCatalog()),
      )
  },
})

export const LoadPainting = Application.command('LoadPainting', {
  args: { paintingId: Schema.Number },
  messages: [Message.CompletedLoadPainting],
  handler: function* () {
    return ({ paintingId }) =>
      Effect.sleep(PAINTING_LATENCY).pipe(
        Effect.as(Message.CompletedLoadPainting({ paintingId })),
      )
  },
})

export const SaveDraft = Application.command('SaveDraft', {
  args: { draft: Schema.String },
  messages: [Message.CompletedSaveDraft],
  handler: function* () {
    return ({ draft }) =>
      Effect.sleep(SAVE_LATENCY).pipe(
        Effect.as(Message.CompletedSaveDraft({ draft })),
      )
  },
})

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
  LoadCatalog.layer,
  LoadPainting.layer,
  SaveDraft.layer,
)
