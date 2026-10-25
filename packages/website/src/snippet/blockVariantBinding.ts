import { Schema } from 'effect'
import { Block } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'
import { makeVariantBinding } from 'foldkit/variantBinding'

import { EditorBlock } from './blockVariantChild'

const Submitted = taggedStruct('Submitted', { submissionId: Schema.String })
const Model = Schema.Union([EditorBlock.Model, Submitted])
const ProfileDefinition = Block.makeDefinition('Profile', {
  Model,
  Message: Schema.Never,
})
export const EditorBinding = makeVariantBinding(ProfileDefinition, EditorBlock)
export const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [EditorBinding],
})
export const init = ProfileComposition.makeInit((displayName: string) =>
  EditorBinding.init({
    args: [displayName],
    toParentModel: nextEditor => nextEditor,
  }),
)
export const update = ProfileComposition.makeUpdate({})
