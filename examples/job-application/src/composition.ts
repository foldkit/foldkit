import type { Block } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import {
  AttachmentsBlock,
  CoverLetterBlock,
  EducationBlock,
  PersonalInfoBlock,
  SkillsBlock,
  WorkHistoryBlock,
} from './blocks'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'

export const PersonalInfoBinding = makeRequiredFieldBinding(PersonalInfoBlock, {
  field: 'personalInfo',
  init: { contextToArgs: ({ today }) => [today] },
})

export const WorkHistoryBinding = makeRequiredFieldBinding(WorkHistoryBlock, {
  field: 'workHistory',
  init: {
    contextToArgs: ({ today, initialWorkHistoryEntryId }) => [
      today,
      initialWorkHistoryEntryId,
    ],
  },
})

export const EducationBinding = makeRequiredFieldBinding(EducationBlock, {
  field: 'education',
  init: {
    contextToArgs: ({ today, initialEducationEntryId }) => [
      today,
      initialEducationEntryId,
    ],
  },
})

export const SkillsBinding = makeRequiredFieldBinding(SkillsBlock, {
  field: 'skills',
  init: {
    contextToArgs: ({ initialSkillsEntryId }) => [initialSkillsEntryId],
  },
})

export const CoverLetterBinding = makeRequiredFieldBinding(CoverLetterBlock, {
  field: 'coverLetter',
})

export const AttachmentsBinding = makeRequiredFieldBinding(AttachmentsBlock, {
  field: 'attachments',
})

export const StepMenuBinding = makeRequiredFieldBinding(StepMenuBlock, {
  field: 'stepMenu',
  init: { contextToArgs: () => [{ id: 'step-menu' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StepMenuBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        currentStep: () => value,
      })),
    Closed: makeNoopStep,
  }),
})

export const StepTabsBinding = makeRequiredFieldBinding(StepTabsBlock, {
  field: 'stepTabs',
  init: { contextToArgs: () => [{ id: 'step-tabs' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StepTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        currentStep: () => value,
      })),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [
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
