import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'

import {
  DomainCandidateRange,
  queryToMaybeDomainLabel,
} from '../../shared/domain'
import { ReadCurrentTime } from '../command'
import { DomainsQueryBinding } from '../composition'
import { makeCommandsStep, makeStep } from '../definition'
import { findNextDomainRangeToLoad } from '../domainPlanning'
import {
  DomainsQuery,
  DomainsQueryArgs,
  type DomainsQueryCompletedFetch,
} from '../domainsQuery'
import type { CompletedReadCurrentTimeMessage } from '../message'
import { routeToQuery } from '../route'
import {
  includeDomainRangeInResults,
  useFullCatalogResultsIfLoaded,
} from './resultSelection'
import { informResultsList } from './resultsList'

export const requestNextDomainRange = makeStep(model =>
  Option.match(findNextDomainRangeToLoad(model), {
    onNone: () => ({ model }),
    onSome: range => requestDomainRange(range)(model),
  }),
)

export const requestDomainRange = (
  { offset, limit }: DomainCandidateRange,
  isRefreshRequested = false,
) =>
  makeCommandsStep(model => [
    ReadCurrentTime({
      searchGeneration: model.searchGeneration,
      offset,
      limit,
      isRefreshRequested,
    }),
  ])

export const loadDomainRange = makeStep(
  (model, message: CompletedReadCurrentTimeMessage) => {
    if (message.searchGeneration !== model.searchGeneration) {
      return { model }
    }

    const maybeDomainLabel = pipe(
      model.route,
      routeToQuery,
      queryToMaybeDomainLabel,
    )

    if (Option.isNone(maybeDomainLabel)) {
      return { model }
    }

    const isDomainRequestPending = Array.some(
      DomainsQuery.pendingArgs(model.domainsQuery),
      args => args.label === maybeDomainLabel.value,
    )

    if (isDomainRequestPending) {
      return { model }
    }

    const range: DomainCandidateRange = {
      offset: message.offset,
      limit: message.limit,
    }
    const args: DomainsQueryArgs = {
      label: maybeDomainLabel.value,
      ...range,
    }

    return Update.combineSteps([
      includeDomainRangeInResults(range),
      message.isRefreshRequested
        ? DomainsQueryBinding.requestRevalidationOrLoad(args)
        : DomainsQueryBinding.requestLoadIfStale(args, message.nowMillis),
      useFullCatalogResultsIfLoaded(args),
      requestNextDomainRange,
      informResultsList,
    ])
  },
)

export const continueSearchAfterDomainRequest = ({
  args,
}: DomainsQueryCompletedFetch) =>
  makeStep(model => {
    const isCurrentSearch = Option.contains(
      queryToMaybeDomainLabel(routeToQuery(model.route)),
      args.label,
    )

    if (!isCurrentSearch) {
      return { model }
    }

    return Update.combineSteps([
      useFullCatalogResultsIfLoaded(args),
      requestNextDomainRange,
      informResultsList,
    ])
  })
