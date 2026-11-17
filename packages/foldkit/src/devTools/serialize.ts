import {
  Array,
  BigDecimal,
  Chunk,
  Function,
  Match,
  Option,
  Predicate,
  Record,
  Redacted,
} from 'effect'

import type {
  SerializedCommand,
  SerializedEntry,
  SerializedMount,
} from './protocol.js'
import type { CommandRecord, HistoryEntry, MountRecord } from './store.js'
import { extractSubmodelInfo } from './submodelPath.js'

const inspectableCache = new WeakMap<object, unknown>()
const activeInspectionValues = new WeakSet<object>()
const CIRCULAR_REFERENCE = '[Circular]'

const computeInspectableValue = (value: unknown): unknown =>
  Match.value(value).pipe(
    Match.when(Redacted.isRedacted, globalThis.String),
    Match.when(Match.instanceOf(File), file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })),
    Match.when(Match.instanceOf(Blob), blob => ({
      size: blob.size,
      type: blob.type,
    })),
    Match.when(Match.instanceOf(Date), date => date.toISOString()),
    Match.when(Match.instanceOf(URL), ({ href }) => href),
    Match.when(BigDecimal.isBigDecimal, value =>
      BigDecimal.format(BigDecimal.make(value.value, value.scale)),
    ),
    Match.when(Chunk.isChunk, chunk =>
      Array.map(Chunk.toReadonlyArray(chunk), toInspectableValue),
    ),
    Match.when(globalThis.Array.isArray, Array.map(toInspectableValue)),
    Match.when(Predicate.isObject, Record.map(toInspectableValue)),
    Match.orElse(Function.identity),
  )

/**
 * Convert values into the representation DevTools displays. Effect `Chunk`
 * values become arrays, `BigDecimal` values become decimal strings, and
 * `Redacted` values become labeled placeholders. File and Blob metadata becomes
 * plain objects; Dates and URLs become strings.
 *
 * Arrays, records, and Chunk elements are converted recursively. References
 * back to a value being inspected become `[Circular]` instead of being expanded
 * again. Shared values reuse their completed conversion. BigDecimals are
 * formatted without changing their normalization caches.
 *
 * Completed conversions are memoized by input identity so repeated inspection
 * of an immutable snapshot preserves the references used by view memoization.
 */
export const toInspectableValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (activeInspectionValues.has(value)) {
    return CIRCULAR_REFERENCE
  }

  if (inspectableCache.has(value)) {
    return inspectableCache.get(value)
  }

  activeInspectionValues.add(value)

  try {
    const result = computeInspectableValue(value)
    inspectableCache.set(value, result)
    return result
  } finally {
    activeInspectionValues.delete(value)
  }
}

/**
 * Convert a runtime `CommandRecord` to its wire shape. Args are wrapped in an
 * `Option` so `None` cleanly distinguishes argless Commands from Commands that
 * happen to have an empty args record. Nested Effect `Redacted` values become
 * their placeholder strings before transmission.
 */
export const toSerializedCommand = (
  command: CommandRecord,
): SerializedCommand => ({
  name: command.name,
  args: Option.map(
    Option.fromNullishOr(command.args),
    Record.map(toInspectableValue),
  ),
  maybeSubmodelPath: command.maybeSubmodelPath,
})

/**
 * Convert a runtime `MountRecord` to its wire shape. Args are wrapped in an
 * `Option` so `None` cleanly distinguishes argless Mounts from Mounts that
 * happen to have an empty args record. Nested Effect `Redacted` values become
 * their placeholder strings before transmission.
 */
export const toSerializedMount = (mount: MountRecord): SerializedMount => ({
  name: mount.name,
  args: Option.map(
    Option.fromNullishOr(mount.args),
    Record.map(toInspectableValue),
  ),
})

/**
 * Convert a `HistoryEntry` plus its absolute index into the wire-friendly
 * `SerializedEntry` shape. Flattens the diff's `HashSet` path collections to
 * plain string arrays for JSON transmission and runs the message body through
 * `toInspectableValue` so Effect `Redacted` values become placeholders and
 * DOM-class instances become inspectable objects.
 */
export const toSerializedEntry = (
  entry: HistoryEntry,
  index: number,
): SerializedEntry => {
  const { submodelPath, maybeLeafTag } = extractSubmodelInfo(
    entry.tag,
    entry.message,
  )

  return {
    index,
    tag: entry.tag,
    message: toInspectableValue(entry.message),
    commands: Array.map(entry.commands, toSerializedCommand),
    mountStarts: Array.map(entry.mountStarts, toSerializedMount),
    mountEnds: Array.map(entry.mountEnds, toSerializedMount),
    timestamp: entry.timestamp,
    isModelChanged: entry.isModelChanged,
    changedPaths: Array.fromIterable(entry.diff.changedPaths),
    affectedPaths: Array.fromIterable(entry.diff.affectedPaths),
    submodelPath,
    maybeLeafTag,
  }
}
