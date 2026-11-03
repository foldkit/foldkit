import { Update } from 'foldkit'

import { makeFieldsStep } from '../definition'
import { AvailabilityFilter, SortOrder, TldFilter } from '../domain'
import { requestNextDomainRange } from './domainRequests'
import { informResultsList } from './resultsList'

export const updateTldFilter = (value: TldFilter) =>
  Update.combineSteps([
    makeFieldsStep(() => ({ tldFilter: () => value })),
    requestNextDomainRange,
    informResultsList,
  ])

export const updateAvailabilityFilter = (value: AvailabilityFilter) =>
  Update.combineSteps([
    makeFieldsStep(() => ({ availabilityFilter: () => value })),
    requestNextDomainRange,
    informResultsList,
  ])

export const updateSortOrder = (value: SortOrder) =>
  Update.combineSteps([
    makeFieldsStep(() => ({ sortOrder: () => value })),
    requestNextDomainRange,
    informResultsList,
  ])
