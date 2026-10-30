import { Effect, Schema } from 'effect'
import { Block, Command, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url.Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
})

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export class Application extends Block<
  Application,
  Readonly<{ url: Url.Url }>
>()('Application', {
  Model: Schema.Struct({ path: Schema.String }),
  Message,
  Command: [NavigateInternal, LoadExternal],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { path: url.pathname },

      update: {
        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url }) => ({
              model,
              commands: [NavigateInternal({ url: Url.toString(url) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),
        ChangedUrl: (model, { url }) => ({
          model: modifyFields(model, { path: () => url.pathname }),
        }),
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
      },

      commands: {
        NavigateInternal: ({ url }) =>
          pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view: (model, h) => ({
        title: model.path,
        body: h.nav(
          [],
          [
            h.a([h.Href('/')], ['Home']),
            h.a([h.Href('/about')], ['About']),
            h.p([], [`You are at ${model.path}`]),
          ],
        ),
      }),
    }
  }),
)
