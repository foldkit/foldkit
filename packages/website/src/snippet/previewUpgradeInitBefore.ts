// Before: init through the Composition, child args from a Binding selector.
import { Block } from 'foldkit'

import { ProfileDefinition } from './definition'
import type { ProfileChildInitContext } from './model'
import { ThemePickerBlock } from './themePicker'

const ThemePickerBinding = ProfileDefinition.makeBinding(ThemePickerBlock, {
  field: 'themePicker',
  init: {
    contextToArgs: ({ savedTheme }) => [savedTheme],
  },
})

const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [ThemePickerBinding],
})

const init = ProfileComposition.makeInit(
  (childInitContext: ProfileChildInitContext) => ({
    childInitContext,
    model: { username: childInitContext.username },
    commands: [LoadAvatar({ username: childInitContext.username })],
  }),
)

const prepare = () => ProfileComposition.prepareBlock({ init, update, view })
export const ProfileBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
