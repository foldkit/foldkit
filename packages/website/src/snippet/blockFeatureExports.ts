// page/settings/block.ts
import { Block } from 'foldkit'

import type { Model } from './model'

const requestReset = Message.RequestedReset
const prepare = () =>
  SettingsComposition.prepareBlock({
    init,
    update,
    view,
    operations: { requestReset },
    EffectsLayer: SaveTheme.layer,
  })
export const SettingsBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

// page/settings/index.ts
export { SettingsBlock } from './block'

// Parent model.ts
import { Schema } from 'effect'

import { SettingsBlock } from './page/settings'

export const Model = Schema.Struct({ settings: SettingsBlock.Model })
export type Model = typeof Model.Type
// Parent composition.ts
import { SettingsBlock } from './page/settings'

ApplicationDefinition.makeBinding(SettingsBlock, {
  field: 'settings',
  init: false,
}).withOutMessagePolicy({ fold: foldSettingsOutMessage })
