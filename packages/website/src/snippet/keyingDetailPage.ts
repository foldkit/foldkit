import { html } from 'foldkit/html'

// One function renders every article, so every article shares this
// function's identity. The key names which article is showing, so
// navigating replaces the old page instead of patching its DOM,
// scroll position included, into the next one
const articlePageView = (article: Article): Html => {
  const h = html<Message>()

  return h.keyed('article')(
    article.slug,
    [],
    [h.h1([], [article.title]), h.p([], [article.body])],
  )
}
