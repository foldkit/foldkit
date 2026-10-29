// ❌ Bad: isLoading, maybeData, and maybeError can contradict one another.

import { Option, Schema } from 'effect'

const Model = Schema.Struct({
  isLoading: Schema.Boolean,
  maybeData: Schema.Option(Schema.Array(Schema.String)),
  maybeError: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const impossibleModel: Model = {
  isLoading: true,
  maybeData: Option.some(['Current data']),
  maybeError: Option.some('The request failed'),
}
