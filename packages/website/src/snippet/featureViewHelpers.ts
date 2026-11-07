import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Article = Schema.Struct({ id: Schema.String, title: Schema.String })
type Article = typeof Article.Type

const Model = Schema.Struct({ articles: Schema.Array(Article) })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedArticle: { id: Schema.String } })
type Message = typeof Message.Type

export const ArticlesKey = Symbol('Articles')
const ArticlesBlock = Block.make('Articles', {
  key: ArticlesKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeComposition } = ArticlesBlock

const ArticlesComposition = makeComposition()
type ArticlesViewBuilder = Block.ViewBuilderFor<typeof ArticlesComposition>

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

const articleItems = (
  articles: ReadonlyArray<Article>,
  h: ArticlesViewBuilder,
) => Array.map(articles, article => articleCard(article, h))

export const view = ArticlesComposition.makeView((model, h) =>
  h.section([], [headerView(h), h.ul([], articleItems(model.articles, h))]),
)
