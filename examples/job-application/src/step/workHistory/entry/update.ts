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
  WorkHistoryEntryDefinition,
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
  UpdatedCompany: WorkHistoryEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ company: () => validateCompany(value) }),
  ),

  UpdatedTitle: WorkHistoryEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ title: () => validateTitle(value) }),
  ),

  ToggledCurrentlyEmployed:
    WorkHistoryEntryDefinition.makeFieldsStep.fromMessage(({ isChecked }) => ({
      isCurrentlyEmployed: () => isChecked,
    })),

  UpdatedDescription: WorkHistoryEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ description: () => value }),
  ),

  RequestedRevealErrors: WorkHistoryEntryDefinition.makeFieldsStep(() => ({
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })),

  ClickedRemoveSelf: WorkHistoryEntryDefinition.makeOutMessageStep(() =>
    OutMessage.Removed(),
  ),
})

export const hasErrors = (entry: typeof Model.Type): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: typeof Model.Type): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])
