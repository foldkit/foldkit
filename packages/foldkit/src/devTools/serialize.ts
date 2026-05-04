import {
  Array as Array_,
  Function,
  Match as M,
  Predicate,
  Record,
} from 'effect'

import type { SerializedEntry } from './protocol.js'
import type { HistoryEntry } from './store.js'
import { extractSubmodelInfo } from './submodelPath.js'

const inspectableCache = new WeakMap<object, unknown>()

const computeInspectableValue = (value: unknown): unknown =>
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
    M.when(Predicate.isObject, Record.map(toInspectableValue)),
    M.orElse(Function.identity),
  )

/**
 * Convert DOM-class instances (File, Blob, Date, URL) to plain-object
 * representations so the tree renderer's key-enumeration walk can see their
 * meaningful data, which otherwise lives on the prototype as getters and
 * is invisible to `Object.keys`. Recurses through arrays and records so
 * the transform applies at every level. File is matched before Blob
 * because File extends Blob.
 *
 * Memoized by reference. The transform allocates fresh wrappers via
 * `Array_.map` / `Record.map` even when the input contains no DOM classes
 * (because `map` always allocates), which would otherwise produce a fresh
 * tree of references on every call. Without memoization, the inspector
 * tree's row-level `lazyTreeNode` cache would miss on every row of every
 * render — the cached row args reference last render's wrapper objects, not
 * this render's. Memoizing on the input reference makes subsequent calls
 * with the same snapshot return identical references end-to-end, so the
 * row lazy actually hits.
 */
export const toInspectableValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (inspectableCache.has(value)) {
    return inspectableCache.get(value)
  }
  const result = computeInspectableValue(value)
  inspectableCache.set(value, result)
  return result
}

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
    changedPaths: Array_.fromIterable(entry.diff.changedPaths),
    affectedPaths: Array_.fromIterable(entry.diff.affectedPaths),
    submodelPath,
    maybeLeafTag,
  }
}
