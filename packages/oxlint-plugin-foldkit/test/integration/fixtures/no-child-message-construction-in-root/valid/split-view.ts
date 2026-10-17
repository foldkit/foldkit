import { CommandPalette } from '@foldkit/ui'

import { child, Message } from './split-child'
import { picker } from './picker'

const ChildComposition = child.makeComposition()

export const splitView = ChildComposition.makeView((_model, h) =>
  h.button([h.OnClick(Message.ClickedSave())]),
)

export const splitViewWithInputs = ChildComposition.makeView.withInputs<unknown>(
  (_model, _viewInputs, h) =>
    h.button([h.OnClick(Message.ClickedSaveWithInputs())]),
)

export const completedNamespaceView = CommandPalette.makeView((_model, h) =>
  h.button([h.OnClick(CommandPalette.Message.ClickedSave())]),
)

export const genericFactoryView = picker.makeView((_model, h) =>
  h.button([h.OnClick(picker.Message.SelectedValue())]),
)
