import { Effect, Schema } from 'effect'
import { Command, Navigation } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedReplaceUrl: {},
  CompletedGoBack: {},
  CompletedGoForward: {},
  CompletedLoadExternal: {},
  CompletedOpenUrl: {},
})
type Message = typeof Message.Type

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})
const NavigateInternalLayer = NavigateInternal.toLayer(
  Effect.succeed(({ url }) =>
    Navigation.pushUrl(url).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
  ),
)

const ReplaceUrl = Command.define('ReplaceUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceUrl],
})
const ReplaceUrlLayer = ReplaceUrl.toLayer(
  Effect.succeed(({ url }) =>
    Navigation.replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceUrl())),
  ),
)

const GoBack = Command.define('GoBack', {
  messages: [Message.CompletedGoBack],
})
const GoBackLayer = GoBack.toLayer(
  Effect.succeed(() =>
    Navigation.back().pipe(Effect.as(Message.CompletedGoBack())),
  ),
)

const GoForward = Command.define('GoForward', {
  messages: [Message.CompletedGoForward],
})
const GoForwardLayer = GoForward.toLayer(
  Effect.succeed(() =>
    Navigation.forward().pipe(Effect.as(Message.CompletedGoForward())),
  ),
)

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})
const LoadExternalLayer = LoadExternal.toLayer(
  Effect.succeed(({ href }) =>
    Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
  ),
)

const OpenUrl = Command.define('OpenUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedOpenUrl],
})
const OpenUrlLayer = OpenUrl.toLayer(
  Effect.succeed(({ url }) =>
    Navigation.openUrl(url).pipe(Effect.as(Message.CompletedOpenUrl())),
  ),
)
