import { HashMap, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchPostDetail } from './command'
import {
  ApplicationComposition,
  applyPostsTransition,
  applyStatsTransition,
} from './composition'
import { ApplicationDefinition } from './definition'
import { PostDetailData } from './model'

const setPostDetail = (
  postId: string,
  postDetail: typeof PostDetailData.schema.Type,
) => HashMap.set(postId, postDetail)

export const update = ApplicationComposition.makeUpdate({
  ClickedPost: (model, { postId }) => {
    const selectedModel = modifyFields(model, {
      maybeSelectedPostId: () => Option.some(postId),
    })

    return Option.match(HashMap.get(model.postDetailById, postId), {
      onNone: () => ({
        model: modifyFields(selectedModel, {
          postDetailById: setPostDetail(postId, PostDetailData.Loading()),
        }),
        commands: [FetchPostDetail({ postId })],
      }),
      onSome: () => ({ model: selectedModel }),
    })
  },

  ClickedBackToPosts: ApplicationDefinition.makeFieldsStep(() => ({
    maybeSelectedPostId: () => Option.none(),
  })),

  ClickedInvalidatePosts: model =>
    applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

  ClickedRetryPosts: model =>
    applyPostsTransition(model, AsyncData.revalidateOrLoad(model.posts)),

  ClickedRetryPostDetail: (model, { postId }) => ({
    model: modifyFields(model, {
      postDetailById: setPostDetail(postId, PostDetailData.Loading()),
    }),
    commands: [FetchPostDetail({ postId })],
  }),

  ClickedRefreshStats: model =>
    applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

  ClickedRetryStats: model =>
    applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

  TickedRevalidateStats: model =>
    applyStatsTransition(model, AsyncData.revalidate(model.stats)),

  CompletedFetchPosts: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ result }) => ({ posts: AsyncData.settle(result) }),
  ),

  CompletedFetchPostDetail: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ postId, result }) => ({
      postDetailById: HashMap.modify(postId, AsyncData.settle(result)),
    }),
  ),

  CompletedFetchStats: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ result }) => ({ stats: AsyncData.settle(result) }),
  ),
})
