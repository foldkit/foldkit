export {
  InMessage,
  makeBlock,
  layer,
  ScrollAlignment,
  ScrollTarget,
  ScrollContainer,
  ApplyScrollOutcome,
  ObservedAnchor,
  ContainerScrollObservation,
  ContentAlignment,
  HistoryPage,
  AccessibleSet,
  type HistoryRows,
  type HistoryPrependInput,
  type InitConfig,
  type RowHeightInputs,
  type ScrollToOptions,
  type ViewInputs,
  type Completed,
} from './virtualList.js'

export type { VirtualListKey } from './virtualList.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  VirtualListRefinementKey,
  SharedVirtualListProof,
  SharedVirtualListFacts,
} from './virtualList.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { VirtualListReader } from './virtualList.js'
