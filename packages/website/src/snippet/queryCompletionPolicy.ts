import { Effect, Option, Result, Schema } from 'effect'
import { Block } from 'foldkit'
import { Query } from 'foldkit/experimental'

import { postQuery } from './queryKeyedDefine'

const Model = Schema.Struct({
  postDetails: postQuery.Model,
  maybeNotice: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),

  Model,
  Message: Schema.Never,
})

const PostDetailsBinding = ApplicationDefinition.makeBinding(postQuery, {
  field: 'postDetails',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(postQuery, {
    CompletedFetch: ({ args, result }) =>
      Result.isFailure(result)
        ? ApplicationDefinition.makeFieldsStep(() => ({
            maybeNotice: () =>
              Option.some(
                `Could not load post ${args.postId}: ${result.failure}`,
              ),
          }))
        : ApplicationDefinition.makeNoopStep(),
  }),
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PostDetailsBinding],
})
const init = ApplicationComposition.makeInit(() => ({
  model: { maybeNotice: Option.none() },
}))
const update = ApplicationComposition.makeUpdate({})

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const postDetails = yield* PostDetailsBinding

    return {
      children: [postDetails],
      init,
      update,
    }
  }),
).provide(Query.layer)
