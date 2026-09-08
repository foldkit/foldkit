import type { Html, HtmlBuilder } from 'foldkit/html'

const articlePageView = (article: Article, h: HtmlBuilder<Message>): Html =>
  h.keyed('article')(
    article.slug,
    [],
    [h.h1([], [article.title]), h.p([], [article.body])],
  )
