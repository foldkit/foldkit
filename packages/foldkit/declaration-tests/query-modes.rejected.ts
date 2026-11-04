import { DefaultHost, NotifyingKeyedAttached } from './query-modes.accepted.js'

// @ts-expect-error Query factory Blocks do not expose an implementation getter.
export const queryGetter = DefaultHost.get

// @ts-expect-error KeyedQuery factory Blocks do not expose an implementation getter.
export const keyedQueryGetter = NotifyingKeyedAttached.get
