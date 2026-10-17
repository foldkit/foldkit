import { Block } from 'foldkit'

import { Message as ProfileMessage } from './definition'
import {
  ProfileComposition,
  type ProfileViewBuilder as ImportedProfileViewBuilder,
} from './composition'

const Message = ProfileMessage

type ProfileViewBuilder = Block.ViewBuilderFor<typeof ProfileComposition>

const saveButton = (h: ProfileViewBuilder) =>
  h.button([h.OnClick(Message.ClickedSave())])

const importedBuilderSaveButton = (h: ImportedProfileViewBuilder) =>
  h.button([h.OnClick(Message.ClickedSaveFromImportedBuilder())])

export const view = ProfileComposition.makeView((_model, h) =>
  h.div([], [saveButton(h), importedBuilderSaveButton(h)]),
)
