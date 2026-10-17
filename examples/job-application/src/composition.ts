import { type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Application } from './definition'
import { Message } from './message'
import { Model } from './model'
import { StepMenu, StepTabs } from './navigationComponents'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'

export const PersonalInfoBinding = Application.bindChild(PersonalInfo.block, {
  field: 'personalInfo',
  parentMessage: Message.GotPersonalInfoMessage,
  init: { args: ({ today }) => [today] },
})

export const WorkHistoryBinding = Application.bindChild(WorkHistory.block, {
  field: 'workHistory',
  parentMessage: Message.GotWorkHistoryMessage,
  init: {
    args: ({ today, initialWorkHistoryEntryId }) => [
      today,
      initialWorkHistoryEntryId,
    ],
  },
})

export const EducationBinding = Application.bindChild(Education.block, {
  field: 'education',
  parentMessage: Message.GotEducationMessage,
  init: {
    args: ({ today, initialEducationEntryId }) => [
      today,
      initialEducationEntryId,
    ],
  },
})

export const SkillsBinding = Application.bindChild(Skills.block, {
  field: 'skills',
  parentMessage: Message.GotSkillsMessage,
  init: {
    args: ({ initialSkillsEntryId }) => [initialSkillsEntryId],
  },
})

export const CoverLetterBinding = Application.bindChild(CoverLetter.block, {
  field: 'coverLetter',
  parentMessage: Message.GotCoverLetterMessage,
})

export const AttachmentsBinding = Application.bindChild(Attachments.block, {
  field: 'attachments',
  parentMessage: Message.GotAttachmentsMessage,
})

const foldStepMenuOutMessage = StepMenu.OutMessage.match<
  Update.Step<Model, Message>,
  typeof StepMenu.OutMessage.Type
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { currentStep: () => value }),
    }),
})

export const StepMenuBinding = Application.bindChild(StepMenu, {
  field: 'stepMenu',
  parentMessage: Message.GotStepMenuMessage,
  outMessage: { fold: foldStepMenuOutMessage },
  init: { args: () => [{ id: 'step-menu' }] },
})

const foldStepTabsOutMessage = StepTabs.OutMessage.match<
  Update.Step<Model, Message>,
  typeof StepTabs.OutMessage.Type
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { currentStep: () => value }),
    }),
})

export const StepTabsBinding = Application.bindChild(StepTabs, {
  field: 'stepTabs',
  parentMessage: Message.GotStepTabsMessage,
  outMessage: { fold: foldStepTabsOutMessage },
  init: { args: () => [{ id: 'step-tabs' }] },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [
    PersonalInfoBinding,
    WorkHistoryBinding,
    EducationBinding,
    SkillsBinding,
    CoverLetterBinding,
    AttachmentsBinding,
    StepMenuBinding,
    StepTabsBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
