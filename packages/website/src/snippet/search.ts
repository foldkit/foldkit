import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
})

const queryOf = (url: Url): string =>
  url.search.pipe(
    Option.flatMap(search =>
      Option.fromNullishOr(new URLSearchParams(search).get('q')),
    ),
    Option.getOrElse(() => ''),
  )

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model: Schema.Struct({ query: Schema.String }),
    Message,
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { query: queryOf(url) },

      update: {
        ClickedLink: model => ({ model }),
        ChangedUrl: (model, { url }) => ({
          model: modifyFields(model, { query: () => queryOf(url) }),
        }),
      },

      view: (model, h) => ({
        title: 'Search',
        body: h.p([h.Role('status')], [`Results for ${model.query}`]),
      }),
    }
  }),
)
