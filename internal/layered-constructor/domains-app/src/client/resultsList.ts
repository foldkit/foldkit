import { Array, Option, Record, Schema, pipe } from 'effect'

import { VirtualList } from '@foldkit/ui'

import { DomainListing } from './domain'

const RESULTS_GROUP_SIZE = 6

export const DomainListingGroup = Schema.Struct({
  id: Schema.String,
  listings: Schema.Array(DomainListing),
})
export type DomainListingGroup = typeof DomainListingGroup.Type

export const groupDomainListings = (
  listings: ReadonlyArray<DomainListing>,
): ReadonlyArray<DomainListingGroup> =>
  pipe(
    listings,
    Array.chunksOf(RESULTS_GROUP_SIZE),
    Array.map(listings =>
      DomainListingGroup.make({
        id: Array.headNonEmpty(listings).name,
        listings,
      }),
    ),
  )

export const PageScrollKey = Schema.Literals([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
])
export type PageScrollKey = typeof PageScrollKey.Type

export const ResultsListScrollKey = Schema.Union([
  PageScrollKey,
  Schema.Literals(['End']),
])
export type ResultsListScrollKey = typeof ResultsListScrollKey.Type

export const RESULTS_LIST_ID = 'domain-results'
export const RESULTS_GROUP_HEIGHT_PX = 114
export const RESULTS_OVERSCAN_GROUPS = 2
export const ResultsListBlock = VirtualList.makeBlock<DomainListingGroup>()
export type ResultsListModel = typeof ResultsListBlock.Model.Type

export const resultsListConfig: VirtualList.InitConfig = {
  id: RESULTS_LIST_ID,
  rowHeightPx: RESULTS_GROUP_HEIGHT_PX,
  scrollContainer: VirtualList.ScrollContainer.Window(),
}

const MOBILE_RESULTS_WIDTH_PX = 668
const TABLET_RESULTS_WIDTH_PX = 944
const MOBILE_RESULT_HEIGHT_PX = 61
const DESKTOP_RESULT_HEIGHT_PX = 57

export const estimateResultGroupHeightPx = (
  resultsList: ResultsListModel,
  listingCount = RESULTS_GROUP_SIZE,
): number => {
  if (resultsList.measurement._tag === 'Unmeasured') {
    return RESULTS_GROUP_HEIGHT_PX
  }

  const { containerWidth } = resultsList.measurement

  if (containerWidth <= MOBILE_RESULTS_WIDTH_PX) {
    return listingCount * MOBILE_RESULT_HEIGHT_PX
  } else if (containerWidth <= TABLET_RESULTS_WIDTH_PX) {
    return Math.ceil(listingCount / 2) * DESKTOP_RESULT_HEIGHT_PX
  } else {
    return Math.ceil(listingCount / 3) * DESKTOP_RESULT_HEIGHT_PX
  }
}

export const findFirstPendingListingInViewport = (
  listings: ReadonlyArray<DomainListing>,
  resultsList: ResultsListModel,
): Option.Option<DomainListing> => {
  const groups = groupDomainListings(listings)
  const groupHeightPx = (group: DomainListingGroup) =>
    pipe(
      resultsList.measuredRowHeights,
      Record.get(group.id),
      Option.getOrElse(() =>
        estimateResultGroupHeightPx(resultsList, group.listings.length),
      ),
    )

  const groupOffsetsPx = Array.scan(
    groups,
    0,
    (offsetPx, group) => offsetPx + groupHeightPx(group),
  )

  const groupsWithOffsets: ReadonlyArray<{
    group: DomainListingGroup
    offsetPx: number
  }> = Array.zipWith(groups, groupOffsetsPx, (group, offsetPx) => ({
    group,
    offsetPx,
  }))

  const viewportHeightPx =
    resultsList.measurement._tag === 'Measured'
      ? resultsList.measurement.containerHeight
      : RESULTS_GROUP_HEIGHT_PX
  const overscanHeightPx =
    estimateResultGroupHeightPx(resultsList) * RESULTS_OVERSCAN_GROUPS
  const viewportStartPx = resultsList.scrollTop - overscanHeightPx
  const viewportEndPx =
    resultsList.scrollTop + viewportHeightPx + overscanHeightPx

  return pipe(
    groupsWithOffsets,
    Array.filter(
      ({ group, offsetPx }) =>
        offsetPx + groupHeightPx(group) >= viewportStartPx &&
        offsetPx <= viewportEndPx,
    ),
    Array.flatMap(({ group }) => group.listings),
    Array.findFirst(DomainListing.guards.Pending),
  )
}
