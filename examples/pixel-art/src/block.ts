import { Effect, Layer } from 'effect'

import { layer as DialogLayer } from '@foldkit/ui/dialog'
import { layer as ListboxLayer } from '@foldkit/ui/listbox'
import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import {
  ErrorDialogBinding,
  GridSizeConfirmDialogBinding,
  GridSizeRadioGroupBinding,
  PaletteRadioGroupBinding,
  ThemeListboxBinding,
  ToolRadioGroupBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const errorDialog = yield* ErrorDialogBinding
    const themeListbox = yield* ThemeListboxBinding
    const gridSizeConfirmDialog = yield* GridSizeConfirmDialogBinding
    const toolRadioGroup = yield* ToolRadioGroupBinding
    const gridSizeRadioGroup = yield* GridSizeRadioGroupBinding
    const paletteRadioGroup = yield* PaletteRadioGroupBinding

    return {
      children: [
        errorDialog,
        themeListbox,
        gridSizeConfirmDialog,
        toolRadioGroup,
        gridSizeRadioGroup,
        paletteRadioGroup,
      ],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(DialogLayer, ListboxLayer, RadioGroupLayer))
