import { Effect } from 'effect'
import type { Block } from 'foldkit'

import { Child } from '../child'
import { Message as ExtensionMessage } from './definition.ts'
import { Message as RedundantPathMessage } from '././definition'
import {
  Message as ProfileMessage,
  ProfileDefinition,
} from './definition'

const Message = ProfileMessage

export const SaveProfile = ProfileDefinition.makeCommand('SaveProfile', {
  messages: [Message.CompletedSave],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedSave())
  },
})

export const SaveProfileWithExtensionImport = ProfileDefinition.makeCommand(
  'SaveProfileWithExtensionImport',
  {
    messages: [ExtensionMessage.CompletedSaveFromExtensionImport],
    handler: function* () {
      return () =>
        Effect.succeed(ExtensionMessage.CompletedSaveFromExtensionImport())
    },
  },
)

export const SaveProfileWithRedundantLocalPath = ProfileDefinition.makeCommand(
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

export const ChildBinding = ProfileDefinition.makeBinding(Child.block, {
  field: 'child',
  toParentMessage: message => Message.GotChildMessage({ message }),
})

export const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [ChildBinding],
})
export type ProfileViewBuilder = Block.ViewBuilderFor<typeof ProfileComposition>

export const update = ProfileComposition.makeUpdate({
  ClickedSave: model => ({ model, commands: [SaveProfile()] }),
  ClickedSaveFromImportedBuilder: model => ({ model }),
  CompletedSave: model => ({ model }),
  CompletedSaveFromExtensionImport: model => ({ model }),
  CompletedSaveFromRedundantLocalPath: model => ({ model }),
  GotChildMessage: model => ({ model }),
})
