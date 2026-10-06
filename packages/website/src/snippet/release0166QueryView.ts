import { Array } from 'effect'
import { AsyncData } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Posts',
  body: h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedRefreshPosts())], ['Refresh']),
      AsyncData.matchData(postsQuery.read(model.posts), {
        onEmpty: () => h.p([], ['Loading posts…']),
        onFailure: error => h.p([], [error]),
        onData: posts =>
          h.ul(
            [],
            Array.map(posts, post => h.keyed('li')(post.id, [], [post.title])),
          ),
      }),
    ],
  ),
})
