import { Array } from 'effect'

const MAX_LOG_ENTRIES = 50

export const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.take([entry, ...messageLog], MAX_LOG_ENTRIES)
