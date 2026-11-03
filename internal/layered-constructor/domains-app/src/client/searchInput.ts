import { Schema } from 'effect'

export const SearchLayout = Schema.Literals(['Landing', 'Search'])
export type SearchLayout = typeof SearchLayout.Type

export const SearchInputConfig = Schema.Struct({
  id: Schema.String,
  touchMediaQuery: Schema.String,
  desktopMediaQuery: Schema.String,
})
export type SearchInputConfig = typeof SearchInputConfig.Type

export const searchInputConfig = SearchInputConfig.make({
  id: 'domain-search',
  touchMediaQuery: '(hover: none) and (pointer: coarse)',
  desktopMediaQuery:
    '(min-width: 701px) and (hover: hover) and (pointer: fine)',
})

export const SEARCH_INPUT_SELECTOR = `#${searchInputConfig.id}`
