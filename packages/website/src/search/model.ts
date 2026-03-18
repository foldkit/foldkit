import { Match as M, Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

import { SearchResult } from './message'

const Results = S.Array(SearchResult)

export const Idle = ts('Idle')
export const Loading = ts('Loading', { results: Results })
export const Ok = ts('Ok', { results: Results })

export const SearchState = S.Union(Idle, Loading, Ok)
export type SearchState = typeof SearchState.Type

export const resultsFromState = (
  state: SearchState,
): ReadonlyArray<typeof SearchResult.Type> =>
  M.value(state).pipe(
    M.tag('Ok', ({ results }) => results),
    M.tag('Loading', ({ results }) => results),
    M.orElse(() => []),
  )

export const Model = S.Struct({
  dialog: Ui.Dialog.Model,
  query: S.String,
  searchState: SearchState,
  activeResultIndex: S.Number,
})
export type Model = typeof Model.Type
