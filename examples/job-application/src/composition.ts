import type { Block } from 'foldkit'

import {
  ApplicationDefinition,
  makeFieldsStep,
  makeNoopStep,
} from './definition'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'
import {
  AttachmentsBlock,
  CoverLetterBlock,
  EducationBlock,
  PersonalInfoBlock,
  SkillsBlock,
  WorkHistoryBlock,
} from './step'

export const PersonalInfoBinding = ApplicationDefinition.makeBinding(
  PersonalInfoBlock,
  {
    field: 'personalInfo',
    init: { contextToArgs: ({ today }) => [today] },
  },
)

export const WorkHistoryBinding = ApplicationDefinition.makeBinding(
  WorkHistoryBlock,
  {
    field: 'workHistory',
    init: {
      contextToArgs: ({ today, initialWorkHistoryEntryId }) => [
        today,
        initialWorkHistoryEntryId,
      ],
    },
  },
)

export const EducationBinding = ApplicationDefinition.makeBinding(
  EducationBlock,
  {
    field: 'education',
    init: {
      contextToArgs: ({ today, initialEducationEntryId }) => [
        today,
        initialEducationEntryId,
      ],
    },
  },
)

export const SkillsBinding = ApplicationDefinition.makeBinding(SkillsBlock, {
  field: 'skills',
  init: {
    contextToArgs: ({ initialSkillsEntryId }) => [initialSkillsEntryId],
  },
})

export const CoverLetterBinding = ApplicationDefinition.makeBinding(
  CoverLetterBlock,
  {
    field: 'coverLetter',
  },
)

export const AttachmentsBinding = ApplicationDefinition.makeBinding(
  AttachmentsBlock,
  {
    field: 'attachments',
  },
)

export const StepMenuBinding = ApplicationDefinition.makeBinding(
  StepMenuBlock,
  {
    field: 'stepMenu',
    init: { contextToArgs: () => [{ id: 'step-menu' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(StepMenuBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        currentStep: () => value,
      })),
    Closed: makeNoopStep,
  }),
})

export const StepTabsBinding = ApplicationDefinition.makeBinding(
  StepTabsBlock,
  {
    field: 'stepTabs',
    init: { contextToArgs: () => [{ id: 'step-tabs' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(StepTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        currentStep: () => value,
      })),
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
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
