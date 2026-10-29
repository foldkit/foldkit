import { Effect, Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Api, ApiLayer } from './api'

// Remote state is a value in the Model. AsyncData is the shipped six-state
// union, so there is no hand-rolled loading/failure/stale union to maintain.
const UserAsyncData = AsyncData.Schema(User, ApiError)
type UserAsyncData = typeof UserAsyncData.schema.Type
export const Model = Schema.Struct({
  user: UserAsyncData.schema,
})
export type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedLoadUser: {},
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: ApiError },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep } = ApplicationDefinition

const ApplicationComposition = ApplicationDefinition.makeComposition()

// Api is an Effect service; ApiLayer provides it.
const FetchUser = ApplicationDefinition.makeCommand('FetchUser', {
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
  handler: function* () {
    const api = yield* Api

    return () =>
      api.getUser().pipe(
        Effect.map(user => Message.SucceededLoadUser({ user })),
        Effect.catch(error =>
          Effect.succeed(Message.FailedLoadUser({ error })),
        ),
      )
  },
})

export const EffectsLayer = FetchUser.layer
export const ServicesLayer = ApiLayer

export const update = ApplicationComposition.makeUpdate({
  ClickedLoadUser: model => ({
    model: modifyFields(model, { user: () => UserAsyncData.Loading() }),
    commands: [FetchUser()],
  }),
  SucceededLoadUser: makeFieldsStep.fromMessage(({ user }) => ({
    user: () => UserAsyncData.Success({ data: user }),
  })),
  FailedLoadUser: makeFieldsStep.fromMessage(({ error }) => ({
    user: () => UserAsyncData.Failure({ error }),
  })),
})
