import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { html } from 'foldkit/html'

const postsSection = (model: Model): Html => {
  const h = html<Message>()
  const keyedDiv = h.keyed('div')

  return AsyncData.matchDataSplitEmpty(model.posts, {
    onIdle: () => keyedDiv('Idle', [], [promptView()]),
    onLoading: () => keyedDiv('Loading', [], [spinnerView()]),
    onFailure: error => keyedDiv('Failure', [], [errorView(error)]),
    onData: posts => keyedDiv('Loaded', [], [postsView(posts, model.posts)]),
  })
}

const postsView = (posts: ReadonlyArray<Post>, state: PostsData): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      ...(AsyncData.isRefreshing(state)
        ? [h.keyed('span')('refreshing', [], [refreshingBadge()])]
        : []),
      ...Option.match(AsyncData.getError(state), {
        onNone: () => [],
        onSome: error => [h.keyed('div')('stale', [], [staleBanner(error)])],
      }),
      h.keyed('ul')('list', [], postListItems(posts)),
    ],
  )
}
