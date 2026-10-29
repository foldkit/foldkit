// ❌ Compose state through an inferred assembly without an export header.
import { Schema } from 'effect'
import { Block } from 'foldkit'

const SettingsComposition = Block.makeDefinition('Settings', {
  Model: Schema.String,
  Message: Schema.Never,
}).makeComposition()
const prepare = () =>
  SettingsComposition.prepareBlock({
    init: SettingsComposition.makeInit(() => ({ model: '' })),
    update: SettingsComposition.makeUpdate({}),
  })
const SettingsBlock = Block.assemble(prepare)

export const Model = Schema.Struct({ settings: SettingsBlock.Model })
export type Model = typeof Model.Type
