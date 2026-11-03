import { Array } from 'effect'
import { AsyncData } from 'foldkit'

import { DomainCandidateRange, domainTlds } from '../../shared/domain'
import { makeFieldsStep } from '../definition'
import { DomainsQuery, DomainsQueryArgs } from '../domainsQuery'

export const includeDomainRangeInResults = (range: DomainCandidateRange) =>
  makeFieldsStep(() => ({
    selectedDomainRanges: ranges => {
      const isRangeSelected = Array.some(
        ranges,
        existing =>
          existing.offset === range.offset && existing.limit === range.limit,
      )

      return isRangeSelected ? ranges : Array.append(ranges, range)
    },
  }))

export const useFullCatalogResultsIfLoaded = (args: DomainsQueryArgs) =>
  makeFieldsStep(model => {
    const isFullCatalogRange =
      args.offset === 0 && args.limit === domainTlds.length
    const isFullCatalogLoaded =
      isFullCatalogRange &&
      AsyncData.isSuccess(DomainsQuery.read(model.domainsQuery, args))

    return isFullCatalogLoaded
      ? {
          selectedDomainRanges: () => [
            { offset: args.offset, limit: args.limit },
          ],
        }
      : {}
  })
