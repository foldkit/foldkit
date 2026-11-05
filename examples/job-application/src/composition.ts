import type { Block } from 'foldkit'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
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

export const PersonalInfoBinding = makeBinding(PersonalInfoBlock, {
  field: 'personalInfo',
  init: { contextToArgs: ({ today }) => [today] },
})

export const WorkHistoryBinding = makeBinding(WorkHistoryBlock, {
  field: 'workHistory',
  init: {
    contextToArgs: ({ today, initialWorkHistoryEntryId }) => [
      today,
      initialWorkHistoryEntryId,
    ],
  },
})

export const EducationBinding = makeBinding(EducationBlock, {
  field: 'education',
  init: {
    contextToArgs: ({ today, initialEducationEntryId }) => [
      today,
      initialEducationEntryId,
    ],
  },
})

export const SkillsBinding = makeBinding(SkillsBlock, {
  field: 'skills',
  init: {
    contextToArgs: ({ initialSkillsEntryId }) => [initialSkillsEntryId],
  },
})

export const CoverLetterBinding = makeBinding(CoverLetterBlock, {
  field: 'coverLetter',
})

export const AttachmentsBinding = makeBinding(AttachmentsBlock, {
  field: 'attachments',
})

export const StepMenuBinding = makeBinding(StepMenuBlock, {
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

export const StepTabsBinding = makeBinding(StepTabsBlock, {
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
