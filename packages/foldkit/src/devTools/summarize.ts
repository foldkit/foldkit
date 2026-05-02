import {
  Array as Array_,
  Function,
  Match as M,
  Option,
  Predicate,
  Record,
  Schema as S,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'
import { ts } from '../schema/index.js'

const ROOT = 'root'
const PATH_SEPARATOR = '.'
const MAX_DEPTH = 3
const STRING_TRUNCATE = 200
const ARRAY_SAMPLE = 2

// PATH

const Found = ts('Found', {
  value: S.Unknown,
  atPath: S.String,
})

const NotFound = ts('NotFound', {
  failedAt: S.String,
  reason: S.String,
  availableKeys: S.Array(S.String),
})

const PathResolution = S.Union([Found, NotFound])

/**
 * Result of resolving a dot-string path against a Model snapshot.
 *
 * The path representation matches `SerializedEntry.changedPaths` exactly:
 * dot-separated, anchored at the literal segment `root`. `Found.atPath`
 * echoes the canonicalized path; `NotFound.availableKeys` lists the keys
 * present at the deepest segment that resolved, so an agent can recover with
 * one follow-up call.
 */
export type PathResolution = typeof PathResolution.Type

const isExpandable = (
  value: unknown,
): value is Readonly<Record<string, unknown>> | ReadonlyArray<unknown> =>
  Predicate.isObject(value) || Array.isArray(value)

const keysOf = (value: unknown): ReadonlyArray<string> =>
  M.value(value).pipe(
    M.when(Array.isArray, items =>
      Array_.makeBy(items.length, index => index.toString()),
    ),
    M.when(Predicate.isObject, Record.keys),
    M.orElse(() => []),
  )

const segmentsOf = (path: string): ReadonlyArray<string> =>
  path === ROOT ? [] : path.split(PATH_SEPARATOR).slice(1)

const isRootAnchored = (path: string): boolean =>
  path === ROOT || path.startsWith(`${ROOT}${PATH_SEPARATOR}`)

const descend = (parent: unknown, segment: string): Option.Option<unknown> =>
  M.value(parent).pipe(
    M.when(Array.isArray, array =>
      Option.liftPredicate(Number(segment), Number.isInteger).pipe(
        Option.flatMap(index => Array_.get(array, index)),
      ),
    ),
    M.when(Predicate.isObject, record => Record.get(record, segment)),
    M.orElse(() => Option.none()),
  )

/**
 * Walk a dot-string path against a Model snapshot. Returns the resolved value
 * on success, or a structured `NotFound` describing the deepest segment that
 * resolved plus its available keys so an agent can refine.
 */
export const resolvePath = (root: unknown, path: string): PathResolution => {
  if (!isRootAnchored(path)) {
    return NotFound({
      failedAt: '',
      reason: `Path must start with '${ROOT}'. Received: '${path}'.`,
      availableKeys: [],
    })
  }

  const initial: PathResolution = Found({ value: root, atPath: ROOT })

  return Array_.reduce(
    segmentsOf(path),
    initial,
    (resolution, segment): PathResolution => {
      if (resolution._tag === 'NotFound') {
        return resolution
      }
      return Option.match(descend(resolution.value, segment), {
        onNone: () =>
          NotFound({
            failedAt: resolution.atPath,
            reason: isExpandable(resolution.value)
              ? `No '${segment}' at '${resolution.atPath}'.`
              : `Cannot descend into a primitive at '${resolution.atPath}' (looking for '${segment}').`,
            availableKeys: keysOf(resolution.value),
          }),
        onSome: descended =>
          Found({
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
          ...Array_.take(items, ARRAY_SAMPLE - 1),
          ...Option.toArray(Array_.last(items)),
        ]
  return Array_.map(sample, item => summarizeAt(item, depth + 1))
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
  M.value(value).pipe(
    M.when(Predicate.isString, truncateString),
    M.when(Array.isArray, items => summarizeArray(items, depth)),
    M.when(Predicate.isObject, record => summarizeRecord(record, depth)),
    M.orElse(Function.identity),
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
    Array_.isReadonlyArrayNonEmpty(keys),
    `Available keys: ${keys.join(', ')}.`,
  )

/**
 * Format a `NotFound` resolution as a single human-readable line for the
 * `ResponseError.reason` channel. Includes the available keys at the failure
 * point so an agent can refine the path on the next call.
 */
export const formatPathNotFound = (
  notFound: Extract<PathResolution, { _tag: 'NotFound' }>,
): string =>
  Option.match(formatAvailableKeys(notFound.availableKeys), {
    onNone: () => notFound.reason,
    onSome: hint => `${notFound.reason} ${hint}`,
  })
