import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

import { revealFieldErrors } from '../../validation'
import { WorkHistoryEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

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

  RequestedRevealErrors: makeFieldsStep(() => ({
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
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
