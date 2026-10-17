import { Block } from 'foldkit'

import {
  NestedComposition,
  type NestedViewBuilder as ImportedNestedViewBuilder,
} from '../composition/index.js'
import { Message } from '../definition.js'

type NestedViewBuilder = Block.ViewBuilderFor<typeof NestedComposition>

const localButton = (h: NestedViewBuilder) =>
  h.button([h.OnClick(Message.ClickedSave())])

const importedButton = (h: ImportedNestedViewBuilder) =>
  h.button([h.OnClick(Message.ClickedSave())])

export const view = NestedComposition.makeView((_model, h) =>
  h.div([], [localButton(h), importedButton(h)]),
)
