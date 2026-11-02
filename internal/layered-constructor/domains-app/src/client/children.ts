import { fromBlock } from 'foldkit/experimental/layered'

import { DialogBlock as Dialog } from '@foldkit/ui'

import { DomainsQuery } from './domainsQuery'
import {
  AvailabilityListboxBlock as AvailabilityListbox,
  SortListboxBlock as SortListbox,
  TldListboxBlock as TldListbox,
} from './filterListboxes'
import { ResultsListBlock as ResultsList } from './resultsList'

export const DialogBlock = fromBlock(Dialog)
export const DomainsQueryBlock = fromBlock(DomainsQuery)
export const ResultsListBlock = fromBlock(ResultsList)
export const AvailabilityListboxBlock = fromBlock(AvailabilityListbox)
export const SortListboxBlock = fromBlock(SortListbox)
export const TldListboxBlock = fromBlock(TldListbox)
