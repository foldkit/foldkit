import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { revealFieldErrors } from '../../validation'
import { WorkHistoryEntryComposition } from './composition'
import { Message, type Model, OutMessage } from './definition'

// FIELD VALIDATION

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

export const update = WorkHistoryEntryComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedCompany: ({ value }) => ({
      model: modifyFields(model, { company: () => validateCompany(value) }),
    }),

    UpdatedTitle: ({ value }) => ({
      model: modifyFields(model, { title: () => validateTitle(value) }),
    }),

    ToggledCurrentlyEmployed: ({ isChecked }) => ({
      model: modifyFields(model, { isCurrentlyEmployed: () => isChecked }),
    }),

    UpdatedDescription: ({ value }) => ({
      model: modifyFields(model, { description: () => value }),
    }),

    ClickedRemoveSelf: () => ({ model, outMessage: OutMessage.Removed() }),
  }),
)

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])

export const revealErrors = (entry: Model): Model =>
  modifyFields(entry, {
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })
