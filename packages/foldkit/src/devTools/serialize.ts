import {
  Array as Array_,
  Function,
  HashSet,
  Match as M,
  Predicate,
  Record,
} from 'effect'

import type { SerializedEntry } from './protocol.js'
import type { HistoryEntry } from './store.js'
import { extractSubmodelInfo } from './submodelPath.js'

/**
 * Convert DOM-class instances (File, Blob, Date, URL) to plain-object
 * representations so the tree renderer's key-enumeration walk can see their
 * meaningful data, which otherwise lives on the prototype as getters and
 * is invisible to `Object.keys`. Recurses through arrays and records so
 * the transform applies at every level. File is matched before Blob
 * because File extends Blob.
 */
export const toInspectableValue = (value: unknown): unknown =>
  M.value(value).pipe(
    M.when(M.instanceOf(File), file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    })),
    M.when(M.instanceOf(Blob), blob => ({
      size: blob.size,
      type: blob.type,
    })),
    M.when(M.instanceOf(Date), date => date.toISOString()),
    M.when(M.instanceOf(URL), ({ href }) => href),
    M.when(Array.isArray, Array_.map(toInspectableValue)),
    M.when(Predicate.isReadonlyRecord, Record.map(toInspectableValue)),
    M.orElse(Function.identity),
  )

/**
 * Convert a `HistoryEntry` plus its absolute index into the wire-friendly
 * `SerializedEntry` shape. Flattens the diff's `HashSet` path collections to
 * plain string arrays for JSON transmission and runs the message body through
 * `toInspectableValue` so DOM-class instances become inspectable objects.
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
    commandNames: entry.commandNames,
    timestamp: entry.timestamp,
    isModelChanged: entry.isModelChanged,
    changedPaths: HashSet.toValues(entry.diff.changedPaths),
    affectedPaths: HashSet.toValues(entry.diff.affectedPaths),
    submodelPath,
    maybeLeafTag,
  }
}
