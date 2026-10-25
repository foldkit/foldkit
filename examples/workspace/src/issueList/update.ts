import { Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { IssueListComposition } from './composition'
import { IssueListDefinition } from './definition'
import { OutMessage } from './message'

export const update = IssueListComposition.makeUpdate({
  UpdatedGrouping: IssueListDefinition.makeOutMessageStep.fromMessage(
    ({ value }) => OutMessage.ChangedGrouping({ groupBy: value }),
  ),
  UpdatedSavedViewName: IssueListDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ savedViewName: () => value }),
  ),
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
  UpdatedQuery: IssueListDefinition.makeOutMessageStep.fromMessage(
    ({ value }) => OutMessage.ChangedQuery({ query: value }),
  ),
  UpdatedStatusFilter: IssueListDefinition.makeOutMessageStep.fromMessage(
    ({ value }) => {
      if (value === 'All') {
        return OutMessage.ChangedStatusFilter({ maybeStatus: Option.none() })
      }

      return OutMessage.ChangedStatusFilter({
        maybeStatus: Option.some(value),
      })
    },
  ),
  UpdatedSort: IssueListDefinition.makeOutMessageStep.fromMessage(({ value }) =>
    OutMessage.ChangedSort({ sort: value }),
  ),
  ClickedCreateIssue: IssueListDefinition.makeOutMessageStep(() =>
    OutMessage.RequestedCreation(),
  ),
  RequestedClearFilters: IssueListDefinition.makeOutMessageStep(() =>
    OutMessage.RequestedClearFilters(),
  ),
})
