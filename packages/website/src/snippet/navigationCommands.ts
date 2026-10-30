import { Effect, Schema } from 'effect'
import { Block, Command, Navigation } from 'foldkit'
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

const ReplaceUrl = Command.define('ReplaceUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceUrl],
})

const GoBack = Command.define('GoBack', {
  messages: [Message.CompletedGoBack],
})

const GoForward = Command.define('GoForward', {
  messages: [Message.CompletedGoForward],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

const OpenUrl = Command.define('OpenUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedOpenUrl],
})

class Application extends Block<Application>()('Application', {
  Message,
  Command: [
    NavigateInternal,
    ReplaceUrl,
    GoBack,
    GoForward,
    LoadExternal,
    OpenUrl,
  ],
}) {}

const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedReplaceUrl: model => ({ model }),
        CompletedGoBack: model => ({ model }),
        CompletedGoForward: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedOpenUrl: model => ({ model }),
      },

      commands: {
        NavigateInternal: ({ url }) =>
          Navigation.pushUrl(url).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        ReplaceUrl: ({ url }) =>
          Navigation.replaceUrl(url).pipe(
            Effect.as(Message.CompletedReplaceUrl()),
          ),
        GoBack: () =>
          Navigation.back().pipe(Effect.as(Message.CompletedGoBack())),
        GoForward: () =>
          Navigation.forward().pipe(Effect.as(Message.CompletedGoForward())),
        LoadExternal: ({ href }) =>
          Navigation.load(href).pipe(
            Effect.as(Message.CompletedLoadExternal()),
          ),
        OpenUrl: ({ url }) =>
          Navigation.openUrl(url).pipe(Effect.as(Message.CompletedOpenUrl())),
      },

      view: (_model, h) => ({ title: 'Navigation', body: h.main([]) }),
    }
  }),
)
