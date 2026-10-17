import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  ApplicationComposition,
  PostDetailsBinding,
  PostsBinding,
  StatsBinding,
} from './composition'
import { Message } from './message'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedPost: ({ postId }) =>
      PostDetailsBinding.loadIfMissing({ postId })(
        modifyFields(model, {
          maybeSelectedPostId: () => Option.some(postId),
        }),
      ),

    ClickedBackToPosts: () => ({
      model: modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
    }),

    ClickedRefreshPosts: () => PostsBinding.revalidateOrLoad()(model),
    ClickedRetryPosts: () => PostsBinding.revalidateOrLoad()(model),

    ClickedRetryPost: ({ postId }) =>
      PostDetailsBinding.revalidateOrLoad({ postId })(model),

    ClickedRefreshStats: () => StatsBinding.revalidateOrLoad()(model),
    ClickedRetryStats: () => StatsBinding.revalidateOrLoad()(model),
    TickedStatsRefreshInterval: () => StatsBinding.revalidate()(model),
  }),
)
