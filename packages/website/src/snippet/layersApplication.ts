import { modifyFields } from 'foldkit/struct'

import { Application, LoadUser, Message, UserState } from './layers'

export const ApplicationComposition = Application.makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: { user: UserState.Loading() },
  commands: [LoadUser({ userId: 'user-1' })],
}))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    SucceededLoadUser: ({ user }) => ({
      model: modifyFields(model, { user: () => UserState.Loaded({ user }) }),
    }),
    FailedLoadUser: ({ error }) => ({
      model: modifyFields(model, { user: () => UserState.Failed({ error }) }),
    }),
  }),
)

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'User profile',
  body: UserState.match(model.user, {
    Loading: () => h.p([], ['Loading user…']),
    Loaded: ({ user }) => h.p([], [user.name]),
    Failed: ({ error }) => h.p([], [error]),
  }),
}))
