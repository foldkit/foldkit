import { Effect, Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Api, ApiLayer } from './api'

// Remote state is a value in the Model. AsyncData is the shipped six-state
// union, so there is no hand-rolled loading/failure/stale union to maintain.
const UserAsyncData = AsyncData.Schema(User, ApiError)

export const Model = Schema.Struct({
  user: UserAsyncData.schema,
})

const Message = defineMessageUnion({
  ClickedLoadUser: {},
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: ApiError },
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

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
  SucceededLoadUser: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ user }) => ({
      user: () => UserAsyncData.Success({ data: user }),
    }),
  ),
  FailedLoadUser: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      user: () => UserAsyncData.Failure({ error }),
    }),
  ),
})
