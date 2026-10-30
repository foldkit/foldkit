import { Effect, Layer, Option, Result, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { PostQuery } from './queryKeyedDefine'

const Message = defineMessageUnion({
  ClickedPost: { postId: Schema.String },
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    postDetails: PostQuery,
    maybeNotice: Schema.Option(Schema.String),
  }),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const postDetails = yield* new PostQuery('postDetails', {})

    return {
      model: { postDetails, maybeNotice: Option.none() },
      update: {
        ClickedPost: (model, { postId }) => ({
          model,
          messages: [
            model.postDetails.send(
              PostQuery.Message.RequestedLoadIfMissing({ args: { postId } }),
            ),
          ],
        }),
        // Runs only for completions the KeyedQuery accepted.
        ...postDetails.on({
          CompletedFetch: (model, { args, result }) => {
            if (Result.isFailure(result)) {
              return {
                model: modifyFields(model, {
                  maybeNotice: () =>
                    Option.some(
                      `Could not load post ${args.postId}: ${result.failure}`,
                    ),
                }),
              }
            } else {
              return { model }
            }
          },
        }),
      },
    }
  }),
).pipe(Layer.provide(PostQuery.Live))
