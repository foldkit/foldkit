import { Block } from 'foldkit'

// ✅ Good: the child declares an operation that runs its update.

const SettingsComposition = SettingsDefinition.makeComposition()
const requestThemeChange = Message.RequestedThemeChange

const prepare = () =>
  SettingsComposition.prepareBlock({
    init,
    update,
    operations: { requestThemeChange },
    EffectsLayer,
  })
export const block: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const update = ParentComposition.makeUpdate({
  ClickedResetSettings: model =>
    SettingsBinding.requestThemeChange({ theme: 'Light' })(model),
})
