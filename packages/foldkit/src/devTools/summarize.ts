import {
  Array,
  Function,
  Match,
  Option,
  Predicate,
  Record,
  Schema,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'
import { defineTaggedUnion } from '../schema/index.js'

const ROOT = 'root'
const PATH_SEPARATOR = '.'
const MAX_DEPTH = 3
const STRING_TRUNCATE = 200
const ARRAY_SAMPLE = 2

// PATH

const PathResolution = defineTaggedUnion({
  Found: { value: Schema.Unknown, atPath: Schema.String },
  NotFound: {
    failedAt: Schema.String,
    reason: Schema.String,
    availableKeys: Schema.Array(Schema.String),
  },
})

/**
 * The result of looking up a `root.foo.bar` path in a Model snapshot.
 * `PathResolution.Found` returns the value and the path where it was found.
 * `PathResolution.NotFound` reports where the lookup stopped and which keys
 * were available there.
 */
export type PathResolution = typeof PathResolution.Type

const isExpandable = Predicate.isObjectOrArray

const keysOf = (value: unknown): ReadonlyArray<string> =>
  Match.value(value).pipe(
    Match.when(globalThis.Array.isArray, items =>
      Array.makeBy(items.length, index => index.toString()),
    ),
    Match.when(Predicate.isObject, Record.keys),
    Match.orElse(() => []),
  )

const segmentsOf = (path: string): ReadonlyArray<string> =>
  path === ROOT ? [] : path.split(PATH_SEPARATOR).slice(1)

const isRootAnchored = (path: string): boolean =>
  path === ROOT || path.startsWith(`${ROOT}${PATH_SEPARATOR}`)

const descend = (parent: unknown, segment: string): Option.Option<unknown> =>
  Match.value(parent).pipe(
    Match.when(globalThis.Array.isArray, array =>
      Option.liftPredicate(Number(segment), Number.isInteger).pipe(
        Option.flatMap(index => Array.get(array, index)),
      ),
    ),
    Match.when(Predicate.isObject, record => Record.get(record, segment)),
    Match.orElse(() => Option.none()),
  )

/** Looks up a `root.foo.bar` path in a Model snapshot. On failure, returns the
 * deepest path reached and the keys available there. */
export const resolvePath = (root: unknown, path: string): PathResolution => {
  if (!isRootAnchored(path)) {
    return PathResolution.NotFound({
      failedAt: '',
      reason: `Path must start with '${ROOT}'. Received: '${path}'.`,
      availableKeys: [],
    })
  }

  const initial: PathResolution = PathResolution.Found({
    value: root,
    atPath: ROOT,
  })

  return Array.reduce(
    segmentsOf(path),
    initial,
    (resolution, segment): PathResolution => {
      if (resolution._tag === 'NotFound') {
        return resolution
      }
      return Option.match(descend(resolution.value, segment), {
        onNone: () =>
          PathResolution.NotFound({
            failedAt: resolution.atPath,
            reason: isExpandable(resolution.value)
              ? `No '${segment}' at '${resolution.atPath}'.`
              : `Cannot descend into a primitive at '${resolution.atPath}' (looking for '${segment}').`,
            availableKeys: keysOf(resolution.value),
          }),
        onSome: descended =>
          PathResolution.Found({
            value: descended,
            atPath: `${resolution.atPath}${PATH_SEPARATOR}${segment}`,
          }),
      })
    },
  )
}

// SUMMARIZE

const truncateString = (value: string): unknown =>
  value.length <= STRING_TRUNCATE
    ? value
    : {
        _summary: 'string',
        length: value.length,
        head: value.slice(0, STRING_TRUNCATE),
      }

const sampleArray = (
  items: ReadonlyArray<unknown>,
  depth: number,
): ReadonlyArray<unknown> => {
  const sample =
    items.length <= ARRAY_SAMPLE
      ? items
      : [
          ...Array.take(items, ARRAY_SAMPLE - 1),
          ...Option.toArray(Array.last(items)),
        ]
  return Array.map(sample, item => summarizeAt(item, depth + 1))
}

const summarizeArray = (
  items: ReadonlyArray<unknown>,
  depth: number,
): unknown => ({
  _summary: 'array',
  length: items.length,
  sample: sampleArray(items, depth),
})

const summarizeRecord = (
  value: Readonly<Record<string, unknown>>,
  depth: number,
): unknown => {
  if (depth >= MAX_DEPTH) {
    return {
      _summary: 'record',
      keys: Record.keys(value),
    }
  }
  return Record.map(value, child => summarizeAt(child, depth + 1))
}

const summarizeAt = (value: unknown, depth: number): unknown =>
  Match.value(value).pipe(
    Match.when(Predicate.isString, truncateString),
    Match.when(globalThis.Array.isArray, items => summarizeArray(items, depth)),
    Match.when(Predicate.isObject, record => summarizeRecord(record, depth)),
    Match.orElse(Function.identity),
  )

/**
 * Apply structural summarization rules to a value:
 * - Arrays collapse to `{ _summary, length, sample: [head, last] }` at every depth.
 * - Records walk to a depth of 3, then collapse to `{ _summary, keys }`.
 * - Long strings collapse to `{ _summary, length, head }`.
 * - Tagged values (`{ _tag, ... }`) keep their `_tag` since it's a record key.
 *
 * The result is JSON-serializable and intended for transmission to MCP clients
 * with `expand: false`. Use raw values directly when `expand: true`.
 */
export const summarizeValue = (value: unknown): unknown => summarizeAt(value, 0)

// FORMAT

const formatAvailableKeys = (
  keys: ReadonlyArray<string>,
): Option.Option<string> =>
  OptionExt.when(
    Array.isReadonlyArrayNonEmpty(keys),
    `Available keys: ${keys.join(', ')}.`,
  )

/** Formats a `NotFound` result for `ResponseError.reason`, including the keys
 * available where the lookup stopped. */
export const formatPathNotFound = (
  notFound: Extract<PathResolution, { _tag: 'NotFound' }>,
): string =>
  Option.match(formatAvailableKeys(notFound.availableKeys), {
    onNone: () => notFound.reason,
    onSome: hint => `${notFound.reason} ${hint}`,
  })
