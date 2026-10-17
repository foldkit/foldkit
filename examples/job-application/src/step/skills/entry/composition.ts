import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  Message,
  type Model,
  ProficiencyRadioGroup,
  SkillsEntry,
} from './definition'
import { proficiencyRadioGroupId } from './init'

const foldProficiencyRadioGroupOutMessage =
  ProficiencyRadioGroup.OutMessage.match<
    Update.Step<Model, Message>,
    typeof ProficiencyRadioGroup.OutMessage.Type
  >({
    Selected:
      ({ value }) =>
      model => ({
        model: modifyFields(model, { proficiency: () => value }),
      }),
  })

export const ProficiencyRadioGroupBinding = SkillsEntry.bindChild(
  ProficiencyRadioGroup,
  {
    field: 'proficiencyRadioGroup',
    parentMessage: Message.GotProficiencyRadioGroupMessage,
    init: {
      args: entryId => [{ id: proficiencyRadioGroupId(entryId) }],
    },
    outMessage: { fold: foldProficiencyRadioGroupOutMessage },
  },
)

export const SkillsEntryComposition = SkillsEntry.makeComposition({
  childBindings: [ProficiencyRadioGroupBinding],
})
