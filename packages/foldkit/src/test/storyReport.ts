import { Array, Equal, Option, Predicate, Redacted, String, pipe } from 'effect'

import { CommandDefinitionTypeId } from '../command/index.js'
import type { AnyCommand, CommandMatcher } from './internal.js'

const MAX_VALUE_LENGTH = 80
const MAX_NESTED_STRING_LENGTH = 40
const MAX_FORMAT_DEPTH = 3
const MAX_ITEMS = 5
const MAX_DIFF_DEPTH = 8
const MAX_DIFF_LINES = 6
const DETAIL_KEY_WIDTH = 10

/** The label of a `Story.given` step, whose detail already shows the Model. */
export const GIVEN_LABEL = 'Given'

/** How a Story step names itself in a failure report. */
export type StepDescription = Readonly<{
  label: string
  maybeDetail: Option.Option<string>
}>

/** Builds a {@link StepDescription}. */
export const stepDescription = (
  label: string,
  detail?: string,
): StepDescription => ({ label, maybeDetail: Option.fromNullishOr(detail) })

/** The part of a Story simulation a failure report reads. */
export type StorySnapshot = Readonly<{
  model: unknown
  commands: ReadonlyArray<AnyCommand>
  outMessage: unknown
}>

/** A step that ran without throwing, with the simulation on each side. */
export type PassedStep = Readonly<{
  before: StorySnapshot
  after: StorySnapshot
}>

/** Where a Story stopped: at a step, or at the end-of-story check. */
export type StoryFailure = Readonly<{
  maybeFailedStep: Option.Option<number>
  current: StorySnapshot
  error: unknown
}>

const stepDescriptionKey = Symbol('foldkit/test/StepDescription')

/** Attaches a report description to a Story step function. The description
 *  is built only when a Story fails, so passing Stories never format values. */
export const describeStep = <Step extends object>(
  step: Step,
  describe: () => StepDescription,
): Step => Object.assign(step, { [stepDescriptionKey]: describe })

/** Builds the report description attached by {@link describeStep}. */
export const attachedDescription = (
  step: unknown,
): Option.Option<StepDescription> =>
  Predicate.hasProperty(step, stepDescriptionKey) &&
  Predicate.isFunction(step[stepDescriptionKey])
    ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      Option.some((step[stepDescriptionKey] as () => StepDescription)())
    : Option.none()

// FORMAT

const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !globalThis.Array.isArray(value) &&
  !Redacted.isRedacted(value) &&
  !(value instanceof Date)

const tagOf = (value: Record<string, unknown>): Option.Option<string> =>
  Predicate.isString(value['_tag']) ? Option.some(value['_tag']) : Option.none()

const formatDate = (date: Date): string =>
  Number.isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString()

const formatArray = (items: ReadonlyArray<unknown>, depth: number): string => {
  if (Array.isReadonlyArrayEmpty(items)) {
    return '[]'
  }
  if (depth >= MAX_FORMAT_DEPTH) {
    return `[… ${items.length} items]`
  }
  const shown = Array.map(Array.take(items, MAX_ITEMS), item =>
    formatAt(item, depth + 1),
  )
  const more =
    items.length > MAX_ITEMS ? [`… ${items.length - MAX_ITEMS} more`] : []
  return `[${[...shown, ...more].join(', ')}]`
}

const formatRecord = (
  value: Record<string, unknown>,
  depth: number,
): string => {
  const keys = Array.filter(Object.keys(value), key => key !== '_tag')
  const body = Array.match(keys, {
    onEmpty: () => '',
    onNonEmpty: nonEmpty =>
      depth >= MAX_FORMAT_DEPTH
        ? '{ … }'
        : `{ ${pipe(
            nonEmpty,
            Array.map(key => `${key}: ${formatAt(value[key], depth + 1)}`),
            Array.join(', '),
          )} }`,
  })
  return Option.match(tagOf(value), {
    onNone: () => (body === '' ? '{}' : body),
    onSome: tag => (body === '' ? tag : `${tag} ${body}`),
  })
}

const formatAt = (value: unknown, depth: number): string => {
  if (Redacted.isRedacted(value)) {
    return globalThis.String(value)
  }
  if (Predicate.isString(value)) {
    return JSON.stringify(truncate(value, MAX_NESTED_STRING_LENGTH))
  }
  if (Predicate.isFunction(value)) {
    return '<function>'
  }
  if (value instanceof Date) {
    return formatDate(value)
  }
  if (globalThis.Array.isArray(value)) {
    return formatArray(value, depth)
  }
  if (isRecordLike(value)) {
    return formatRecord(value, depth)
  }
  return globalThis.String(value)
}

/** Formats a value on one short line. Redacted values print as their
 *  placeholder, never their content. */
export const formatValue = (value: unknown): string =>
  truncate(formatAt(value, 0), MAX_VALUE_LENGTH)

const formatArgsSuffix = (args: Record<string, unknown> | undefined): string =>
  args === undefined ? '' : ` ${formatValue(args)}`

/** Formats a Command matcher on one short line. */
export const formatMatcherShort = (matcher: CommandMatcher): string =>
  Predicate.hasProperty(matcher, CommandDefinitionTypeId)
    ? matcher.name
    : `${matcher.name}${formatArgsSuffix(matcher.args)}`

const formatCommandShort = (command: AnyCommand): string =>
  `${command.name}${formatArgsSuffix(command.args)}`

const formatCommands = (commands: ReadonlyArray<AnyCommand>): string =>
  truncate(
    pipe(commands, Array.map(formatCommandShort), Array.join(', ')),
    MAX_VALUE_LENGTH,
  )

// DIFF

const joinPath = (path: string, key: string): string =>
  path === '' ? key : `${path}.${key}`

const diffAt = (
  before: unknown,
  after: unknown,
  path: string,
  depth: number,
): ReadonlyArray<string> => {
  if (Object.is(before, after)) {
    return []
  }
  if (
    depth < MAX_DIFF_DEPTH &&
    globalThis.Array.isArray(before) &&
    globalThis.Array.isArray(after) &&
    before.length === after.length
  ) {
    return Array.flatMap(before, (item, index) =>
      diffAt(item, after[index], `${path}[${index}]`, depth + 1),
    )
  }
  if (
    depth < MAX_DIFF_DEPTH &&
    isRecordLike(before) &&
    isRecordLike(after) &&
    Equal.equals(tagOf(before), tagOf(after))
  ) {
    const keys = Array.dedupe([...Object.keys(before), ...Object.keys(after)])
    return Array.flatMap(keys, key =>
      diffAt(before[key], after[key], joinPath(path, key), depth + 1),
    )
  }
  const change = `${formatValue(before)} → ${formatValue(after)}`
  return [path === '' ? change : `${path}: ${change}`]
}

const diffModel = (before: unknown, after: unknown): ReadonlyArray<string> => {
  const lines = diffAt(before, after, '', 0)
  return lines.length <= MAX_DIFF_LINES
    ? lines
    : [
        ...Array.take(lines, MAX_DIFF_LINES),
        `… ${lines.length - MAX_DIFF_LINES} more changes`,
      ]
}

// RENDER

type DetailRow = Readonly<{ key: string; lines: ReadonlyArray<string> }>

const passedDetails = (
  description: StepDescription,
  { before, after }: PassedStep,
): ReadonlyArray<DetailRow> => {
  if (description.label === GIVEN_LABEL) {
    return []
  }
  const modelChanges = diffModel(before.model, after.model)
  const emitted = Array.filter(
    after.commands,
    command => !before.commands.includes(command),
  )
  const outMessageChanged =
    after.outMessage !== undefined && after.outMessage !== before.outMessage

  return [
    ...(Array.isReadonlyArrayNonEmpty(modelChanges)
      ? [{ key: 'model', lines: modelChanges }]
      : []),
    ...(Array.isReadonlyArrayNonEmpty(emitted)
      ? [{ key: 'commands', lines: [formatCommands(emitted)] }]
      : []),
    ...(outMessageChanged
      ? [{ key: 'out', lines: [formatValue(after.outMessage)] }]
      : []),
  ]
}

const firstLine = (error: unknown): string => {
  const text = error instanceof Error ? error.message : globalThis.String(error)
  return truncate(
    pipe(text, String.split('\n'), Array.headNonEmpty),
    MAX_VALUE_LENGTH,
  )
}

const failureDetails = ({
  current,
  error,
}: StoryFailure): ReadonlyArray<DetailRow> => [
  { key: 'error', lines: [firstLine(error)] },
  { key: 'model', lines: [formatValue(current.model)] },
  ...(Array.isReadonlyArrayNonEmpty(current.commands)
    ? [{ key: 'pending', lines: [formatCommands(current.commands)] }]
    : []),
]

type Row = Readonly<{
  mark: string
  number: string
  description: StepDescription
  details: ReadonlyArray<DetailRow>
}>

const renderRow = (
  { mark, number, description, details }: Row,
  numberWidth: number,
  labelWidth: number,
): ReadonlyArray<string> => {
  const detail = Option.getOrElse(description.maybeDetail, () => '')
  const head = `  ${mark} ${number.padStart(numberWidth)} ${description.label.padEnd(labelWidth)}  ${detail}`
  const indent = ' '.repeat(7 + numberWidth + labelWidth)
  const detailLines = Array.flatMap(details, ({ key, lines }) =>
    Array.map(lines, (line, index) =>
      index === 0
        ? `${indent}${key.padEnd(DETAIL_KEY_WIDTH)}${line}`
        : `${indent}${' '.repeat(DETAIL_KEY_WIDTH)}${line}`,
    ),
  )
  return Array.map([head, ...detailLines], line => line.trimEnd())
}

/** Renders every step of a failed Story: ✓ for steps that ran, ✗ for the
 *  step that threw, and a blank mark for steps that never ran. */
export const renderStoryReport = (
  descriptions: ReadonlyArray<StepDescription>,
  passed: ReadonlyArray<PassedStep>,
  failure: StoryFailure,
): string => {
  const total = descriptions.length
  const isFailedStep = (index: number): boolean =>
    Option.exists(failure.maybeFailedStep, failed => failed === index)

  const stepRows: ReadonlyArray<Row> = Array.map(
    descriptions,
    (description, index) => ({
      mark: index < passed.length ? '✓' : isFailedStep(index) ? '✗' : ' ',
      number: `${index + 1}`,
      description,
      details: pipe(
        Array.get(passed, index),
        Option.match({
          onNone: () => (isFailedStep(index) ? failureDetails(failure) : []),
          onSome: passedStep => passedDetails(description, passedStep),
        }),
      ),
    }),
  )
  const endRows: ReadonlyArray<Row> = Option.isNone(failure.maybeFailedStep)
    ? [
        {
          mark: '✗',
          number: '',
          description: stepDescription('End', 'every Command resolved'),
          details: failureDetails(failure),
        },
      ]
    : []
  const rows = [...stepRows, ...endRows]

  const numberWidth = `${total}`.length
  const labelWidth = Math.max(
    0,
    ...Array.map(rows, ({ description }) => description.label.length),
  )
  const header = Option.match(failure.maybeFailedStep, {
    onNone: () => `Story failed after step ${total} of ${total}:`,
    onSome: index => `Story failed at step ${index + 1} of ${total}:`,
  })

  return [
    header,
    '',
    ...Array.flatMap(rows, row => renderRow(row, numberWidth, labelWidth)),
  ].join('\n')
}

/** Appends a Story report to a thrown Error, keeping the same Error instance
 *  so its fields (such as an assertion's expected and actual values) and its
 *  original message stay intact. Non-Error throws pass through unchanged. */
export const withStoryReport = (error: unknown, report: string): unknown => {
  if (error instanceof Error) {
    error.message = `${error.message}\n\n${report}`
  }
  return error
}
