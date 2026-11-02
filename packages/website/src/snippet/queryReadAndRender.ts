import { Array } from 'effect'
import { AsyncData } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { PostsQuery } from './queryDefine'
import type { Application } from './queryParent'

type ApplicationViewBuilder = HtmlBuilder<typeof Application.Message.Type>

export const postsView = (
  model: typeof Application.Model.Type,
  h: ApplicationViewBuilder,
): Html => {
  // Pass the Query's Model to the Query's own accessor.
  const postsAsyncData = PostsQuery.read(model.posts.model)

  return AsyncData.matchData(postsAsyncData, {
    onEmpty: () => h.p([], ['Loading posts…']),
    onFailure: error => h.p([], [error]),
    onData: posts =>
      h.ul(
        [],
        Array.map(posts, post => h.keyed('li')(post.id, [], [post.title])),
      ),
  })
}
