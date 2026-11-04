import { Schema } from 'effect'
import { Block } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'
import { makeVariantBinding } from 'foldkit/variantBinding'

import { EditorBlock } from './blockVariantChild'

const Submitted = taggedStruct('Submitted', { submissionId: Schema.String })
type Submitted = typeof Submitted.Type
const Model = Schema.Union([EditorBlock.Model, Submitted])
type Model = typeof Model.Type

export const ProfileKey = Symbol('Profile')

const ProfileBlock = Block.make('Profile', {
  key: ProfileKey,
  Init: Schema.Tuple([Schema.String]),
  Model,
  Message: Schema.Never,
})
export const EditorBinding = makeVariantBinding(ProfileBlock, EditorBlock)
export const ProfileComposition = ProfileBlock.makeComposition({
  bindings: [EditorBinding],
})
export const init = ProfileComposition.makeInit(displayName =>
  EditorBinding.init({
    args: [displayName],
    toParentModel: nextEditor => nextEditor,
  }),
)
export const update = ProfileComposition.makeUpdate({})
