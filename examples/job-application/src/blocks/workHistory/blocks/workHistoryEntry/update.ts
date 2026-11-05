import { validate } from 'foldkit/fieldValidation'

import { OutMessage, makeFieldsStep, makeOutMessageStep } from './block'
import { WorkHistoryEntryComposition } from './composition'
import { companyRules, titleRules } from './validation'

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

export const update = WorkHistoryEntryComposition.makeUpdate({
  UpdatedCompany: makeFieldsStep.fromMessage(({ value }) => ({
    company: () => validateCompany(value),
  })),

  UpdatedTitle: makeFieldsStep.fromMessage(({ value }) => ({
    title: () => validateTitle(value),
  })),

  ToggledCurrentlyEmployed: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCurrentlyEmployed: () => isChecked,
  })),

  UpdatedDescription: makeFieldsStep.fromMessage(({ value }) => ({
    description: () => value,
  })),

  ClickedRemoveSelf: makeOutMessageStep(() => OutMessage.Removed()),
})
