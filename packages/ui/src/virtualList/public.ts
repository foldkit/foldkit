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
} from './index.js'

/** Original VirtualList Command and Mount Definitions for Story and Scene test resolution. */
export * as test from './test.js'

export type { VirtualListKey } from './index.js'

/** @internal Nameable fixed-family evidence in emitted consumer declarations. */
export type {
  VirtualListRefinementKey,
  SharedVirtualListProof,
  SharedVirtualListFacts,
} from './virtualList.js'

/** @internal Preserves exact fixed-family reader names in emitted declarations. */
export type { VirtualListReader } from './virtualList.js'
