import { Schema } from 'effect'
import { Block } from 'foldkit'
import { taggedStruct } from 'foldkit/schema'

import { EditorBlock } from './blockVariantChild'

const Submitted = taggedStruct('Submitted', { submissionId: Schema.String })
type Submitted = typeof Submitted.Type
const Model = Schema.Union([EditorBlock.Model, Submitted])
type Model = typeof Model.Type

export const ProfileKey = Symbol('Profile')
const ProfileBlock = Block.make('Profile', {
  key: ProfileKey,
  InitArgs: Schema.Tuple([Schema.String]),
  Model,
  Message: Schema.Never,
})

const { makeComposition } = ProfileBlock
export const EditorBinding = ProfileBlock.makeVariantBinding(EditorBlock)
export const ProfileComposition = makeComposition({
  bindings: [EditorBinding],
})
export const init = ProfileComposition.makeInit(displayName =>
  EditorBinding.init({
    args: [displayName],
    toParentModel: nextEditor => nextEditor,
  }),
)
export const update = ProfileComposition.makeUpdate({})
