import { Block } from 'foldkit'

import type { Model } from './layers'
import {
  ApplicationDefinition,
  EffectsLayer,
  LoadUser,
  Message,
  UserState,
} from './layers'

export const ApplicationComposition = ApplicationDefinition.makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: { user: UserState.Loading() },
  commands: [LoadUser({ userId: 'user-1' })],
}))

export const update = ApplicationComposition.makeUpdate({
  SucceededLoadUser: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ user }) => ({ user: () => UserState.Loaded({ user }) }),
  ),
  FailedLoadUser: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({ user: () => UserState.Failed({ error }) }),
  ),
})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'User profile',
  body: UserState.match(model.user, {
    Loading: () => h.p([], ['Loading user…']),
    Loaded: ({ user }) => h.p([], [user.name]),
    Failed: ({ error }) => h.p([], [error]),
  }),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
