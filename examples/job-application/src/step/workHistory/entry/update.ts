import { allValid, anyInvalid, validate } from 'foldkit/fieldValidation'

import { WorkHistoryEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'
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

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])
