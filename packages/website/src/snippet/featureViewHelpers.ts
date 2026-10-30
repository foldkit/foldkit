import { Array, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Article = Schema.Struct({ id: Schema.String, title: Schema.String })
type Article = typeof Article.Type

const Model = Schema.Struct({ articles: Schema.Array(Article) })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedArticle: { id: Schema.String } })
type Message = typeof Message.Type

type ArticlesViewBuilder = HtmlBuilder<Message>

const headerView = (h: ArticlesViewBuilder) => h.h2([], ['Articles'])

const articleCard = (article: Article, h: ArticlesViewBuilder) =>
  h.keyed('li')(
    article.id,
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedArticle({ id: article.id }))],
        [article.title],
      ),
    ],
  )

const articleItems = (model: Model, h: ArticlesViewBuilder) =>
  Array.map(model.articles, article => articleCard(article, h))

export class Articles extends Block<Articles>()('Articles', {
  Model,
  Message,
}) {}

export const ArticlesLive = Articles.make(
  Effect.fn(function* () {
    return {
      model: { articles: [] },

      update: {
        ClickedArticle: model => ({ model }),
      },

      view: (model, h) =>
        h.section([], [headerView(h), h.ul([], articleItems(model, h))]),
    }
  }),
)
