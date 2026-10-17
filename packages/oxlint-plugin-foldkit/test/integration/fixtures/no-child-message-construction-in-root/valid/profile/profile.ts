import { Effect } from 'effect'
import type { Block } from 'foldkit'

import { Child } from '../child'
import { Message as ExtensionMessage } from './definition.ts'
import { Message as RedundantPathMessage } from '././definition'
import { Message as ProfileMessage, Profile } from './definition'

const Message = ProfileMessage

export const SaveProfile = Profile.command('SaveProfile', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSave())
  },
})

export const SaveProfileWithExtensionImport = Profile.command(
  'SaveProfileWithExtensionImport',
  {
    messages: [ExtensionMessage.CompletedSaveFromExtensionImport],
    handler: function* () {
      return () =>
        Effect.succeed(ExtensionMessage.CompletedSaveFromExtensionImport())
    },
  },
)

export const SaveProfileWithRedundantLocalPath = Profile.command(
  'SaveProfileWithRedundantLocalPath',
  {
    messages: [RedundantPathMessage.CompletedSaveFromRedundantLocalPath],
    handler: function* () {
      return () =>
        Effect.succeed(
          RedundantPathMessage.CompletedSaveFromRedundantLocalPath(),
        )
    },
  },
)

export const ChildBinding = Profile.bindChild(Child.block, {
  field: 'child',
  toParentMessage: message => Message.GotChildMessage({ message }),
})

export const ProfileComposition = Profile.makeComposition({
  childBindings: [ChildBinding],
})
export type ProfileViewBuilder = Block.ViewBuilderFor<typeof ProfileComposition>

export const update = ProfileComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedSave: () => ({ model, commands: [SaveProfile()] }),
    CompletedSave: () => ({ model }),
    GotChildMessage: () => ({ model }),
  }),
)
