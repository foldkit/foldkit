import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  ApplicationComposition,
  PostDetailsBinding,
  PostsBinding,
  StatsBinding,
} from './composition'
import { ApplicationDefinition } from './definition'

export const update = ApplicationComposition.makeUpdate({
  ClickedPost: (model, { postId }) =>
    PostDetailsBinding.requestLoadIfMissing({ postId })(
      modifyFields(model, {
        maybeSelectedPostId: () => Option.some(postId),
      }),
    ),

  ClickedBackToPosts: ApplicationDefinition.makeFieldsStep(() => ({
    maybeSelectedPostId: () => Option.none(),
  })),

  ClickedRefreshPosts: PostsBinding.requestRevalidationOrLoad(),
  ClickedRetryPosts: PostsBinding.requestRevalidationOrLoad(),

  ClickedRetryPost: (model, { postId }) =>
    PostDetailsBinding.requestRevalidationOrLoad({ postId })(model),

  ClickedRefreshStats: StatsBinding.requestRevalidationOrLoad(),
  ClickedRetryStats: StatsBinding.requestRevalidationOrLoad(),
  TickedStatsRefreshInterval: StatsBinding.requestRevalidation(),
})
