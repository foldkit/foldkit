import { Option, Result, Schema } from 'effect'
import { Block } from 'foldkit'

const Model = Schema.Struct({
  postDetails: postQuery.Model,
  maybeNotice: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
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
