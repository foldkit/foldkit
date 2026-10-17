import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ child: Schema.Unknown })

export const Message = defineMessageUnion({
  ClickedSave: {},
  ClickedSaveFromImportedBuilder: {},
  CompletedSave: {},
  CompletedSaveFromExtensionImport: {},
  CompletedSaveFromRedundantLocalPath: {},
  GotChildMessage: { message: Schema.Unknown },
})

export const Profile = Block.define('Profile', { Model, Message })
