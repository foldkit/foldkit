import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { IssueListComposition } from './composition'
import { makeFieldsStep, makeOutMessageStep } from './definition'
import { OutMessage } from './outMessage'

export const update = IssueListComposition.makeUpdate({
  UpdatedGrouping: makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.ChangedGrouping({ groupBy: value }),
  ),
  UpdatedSavedViewName: makeFieldsStep.fromMessage(({ value }) => ({
    savedViewName: () => value,
  })),
  SubmittedSavedView: (model, { filters }) => {
    const name = String.trim(model.savedViewName)

    if (String.isEmpty(name)) {
      return { model }
    }

    return {
      model: modifyFields(model, { savedViewName: () => '' }),
      outMessage: OutMessage.SavedFilter({
        name,
        filters,
      }),
    }
  },
  UpdatedQuery: makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.ChangedQuery({ query: value }),
  ),
  UpdatedStatusFilter: makeOutMessageStep.fromMessage(({ value }) => {
    if (value === 'All') {
      return OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() })
    }

    return OutMessage.ChangedStatusFilter({
      maybeStatus: Option.some(value),
    })
  }),
  UpdatedSort: makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.ChangedSort({ sort: value }),
  ),
  ClickedCreateIssue: makeOutMessageStep(() => OutMessage.RequestedCreation()),
  RequestedClearFilters: makeOutMessageStep(() =>
    OutMessage.RequestedClearFilters(),
  ),
})
