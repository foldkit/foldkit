import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'

type WireValue = bigint | Uint8Array
type FieldMap = Map<number, Array<WireValue>>

type FunctionEntry = Readonly<{
  name: string
  filename: string
}>

type FunctionCost = Readonly<{
  name: string
  filename: string
  value: number
  percentage: number
}>

type CostGroup =
  | 'binder'
  | 'checker'
  | 'language-service'
  | 'other'
  | 'parser'
  | 'project'
  | 'runtime-gc'
  | 'runtime-other'
  | 'typescript-other'

const fail = (message: string): never => {
  throw new Error(message)
}

const sha256 = (value: Uint8Array): string =>
  createHash('sha256').update(value).digest('hex')

const readVarint = (
  bytes: Uint8Array,
  start: number,
): Readonly<{ value: bigint; next: number }> => {
  let value = 0n
  let shift = 0n
  let offset = start
  while (offset < bytes.length && shift < 70n) {
    const byte = bytes[offset]
    if (byte === undefined) {
      break
    }
    offset += 1
    value |= BigInt(byte & 0x7f) << shift
    if ((byte & 0x80) === 0) {
      return { value, next: offset }
    }
    shift += 7n
  }
  return fail(`Profile contains an invalid protobuf varint.`)
}

const decodeFields = (bytes: Uint8Array): FieldMap => {
  const fields: FieldMap = new Map()
  let offset = 0
  while (offset < bytes.length) {
    const key = readVarint(bytes, offset)
    offset = key.next
    const number = globalThis.Number(key.value >> 3n)
    const wireType = globalThis.Number(key.value & 7n)
    if (!globalThis.Number.isSafeInteger(number) || number < 1) {
      return fail(`Profile contains an invalid protobuf field number.`)
    }

    let value: WireValue
    if (wireType === 0) {
      const decoded = readVarint(bytes, offset)
      value = decoded.value
      offset = decoded.next
    } else if (wireType === 1 || wireType === 5) {
      const width = wireType === 1 ? 8 : 4
      if (offset + width > bytes.length) {
        return fail(`Profile contains a truncated fixed-width field.`)
      }
      value = bytes.subarray(offset, offset + width)
      offset += width
    } else if (wireType === 2) {
      const length = readVarint(bytes, offset)
      offset = length.next
      const size = globalThis.Number(length.value)
      if (
        !globalThis.Number.isSafeInteger(size) ||
        size < 0 ||
        offset + size > bytes.length
      ) {
        return fail(`Profile contains an invalid length-delimited field.`)
      }
      value = bytes.subarray(offset, offset + size)
      offset += size
    } else {
      return fail(`Profile uses unsupported protobuf wire type ${wireType}.`)
    }

    const values = fields.get(number) ?? []
    values.push(value)
    fields.set(number, values)
  }
  return fields
}

const messageValues = (fields: FieldMap, number: number): Array<Uint8Array> =>
  (fields.get(number) ?? []).map(value =>
    value instanceof Uint8Array
      ? value
      : fail(`Profile field ${number} is not a nested message.`),
  )

const unsignedValues = (fields: FieldMap, number: number): Array<bigint> =>
  (fields.get(number) ?? []).flatMap(value => {
    if (typeof value === 'bigint') {
      return [value]
    }
    const values: Array<bigint> = []
    let offset = 0
    while (offset < value.length) {
      const decoded = readVarint(value, offset)
      values.push(decoded.value)
      offset = decoded.next
    }
    return values
  })

const signedValue = (value: bigint): bigint =>
  value >= 1n << 63n ? value - (1n << 64n) : value

const safeNumber = (value: bigint, label: string): number => {
  const number = globalThis.Number(value)
  if (!globalThis.Number.isSafeInteger(number)) {
    return fail(`${label} exceeds JavaScript's safe integer range.`)
  }
  return number
}

const firstUnsigned = (
  fields: FieldMap,
  number: number,
  label: string,
): number => {
  const value = unsignedValues(fields, number)[0]
  return value === undefined ? 0 : safeNumber(value, label)
}

const percentage = (value: number, total: number): number =>
  total === 0 ? 0 : globalThis.Number(((value / total) * 100).toFixed(2))

const costGroup = (entry: FunctionEntry): CostGroup => {
  const value = `${entry.name} ${entry.filename}`.toLowerCase()
  if (value.includes('/internal/checker')) {
    return 'checker'
  } else if (value.includes('/internal/project')) {
    return 'project'
  } else if (value.includes('/internal/parser')) {
    return 'parser'
  } else if (value.includes('/internal/binder')) {
    return 'binder'
  } else if (
    value.includes('/internal/lsp') ||
    value.includes('/internal/ls.') ||
    value.includes('/internal/ls/')
  ) {
    return 'language-service'
  } else if (
    /runtime\.(?:findobject|gc|greyobject|scan|sweep|systemstack)/.test(
      value,
    ) ||
    value.includes('/runtime/mgc')
  ) {
    return 'runtime-gc'
  } else if (value.startsWith('runtime.') || value.includes('/runtime/')) {
    return 'runtime-other'
  } else if (
    value.includes('github.com/microsoft/typescript-go/internal/') ||
    value.includes('github.com/microsoft/typescript/tsc/internal/')
  ) {
    return 'typescript-other'
  }
  return 'other'
}

const addCost = (costs: Map<string, number>, key: string, value: number) => {
  costs.set(key, (costs.get(key) ?? 0) + value)
}

export const summarizeGoPprof = (compressedProfile: Uint8Array, top = 30) => {
  const profile = decodeFields(gunzipSync(compressedProfile))
  const decoder = new TextDecoder()
  const strings = messageValues(profile, 6).map(value => decoder.decode(value))
  if (strings[0] !== '') {
    return fail(`Profile string table does not start with an empty string.`)
  }
  const stringAt = (index: number): string =>
    strings[index] ?? fail(`Profile references missing string ${index}.`)

  const sampleTypes = messageValues(profile, 1).map(value => {
    const fields = decodeFields(value)
    return {
      type: stringAt(firstUnsigned(fields, 1, 'Sample type index')),
      unit: stringAt(firstUnsigned(fields, 2, 'Sample unit index')),
    }
  })
  if (sampleTypes.length === 0) {
    return fail(`Profile defines no sample types.`)
  }
  const defaultTypeIndex = firstUnsigned(profile, 14, 'Default sample type')
  const defaultType =
    defaultTypeIndex === 0 ? undefined : stringAt(defaultTypeIndex)
  const valueIndex =
    defaultType === undefined
      ? sampleTypes.length - 1
      : sampleTypes.findIndex(sampleType => sampleType.type === defaultType)
  if (valueIndex < 0) {
    return fail(`Profile default sample type is not defined.`)
  }

  const functions = new Map<number, FunctionEntry>()
  for (const value of messageValues(profile, 5)) {
    const fields = decodeFields(value)
    const id = firstUnsigned(fields, 1, 'Function ID')
    functions.set(id, {
      name: stringAt(firstUnsigned(fields, 2, 'Function name index')),
      filename: stringAt(firstUnsigned(fields, 4, 'Function file index')),
    })
  }

  const locations = new Map<number, Array<number>>()
  for (const value of messageValues(profile, 4)) {
    const fields = decodeFields(value)
    const id = firstUnsigned(fields, 1, 'Location ID')
    const functionIds = messageValues(fields, 4).map(line =>
      firstUnsigned(decodeFields(line), 1, 'Line function ID'),
    )
    locations.set(id, functionIds)
  }

  const flat = new Map<string, number>()
  const cumulative = new Map<string, number>()
  const functionEntries = new Map<string, FunctionEntry>()
  let total = 0
  let sampleCount = 0
  for (const value of messageValues(profile, 2)) {
    const fields = decodeFields(value)
    const values = unsignedValues(fields, 2).map(entry =>
      safeNumber(signedValue(entry), 'Sample value'),
    )
    if (values.length !== sampleTypes.length) {
      return fail(`Profile sample value count does not match its sample types.`)
    }
    const cost = values[valueIndex] ?? 0
    total += cost
    sampleCount += 1
    const stack = unsignedValues(fields, 1).flatMap(locationId => {
      const id = safeNumber(locationId, 'Sample location ID')
      return locations.get(id) ?? []
    })
    const keys = stack.map(functionId => {
      const entry =
        functions.get(functionId) ??
        ({ name: '<unsymbolized>', filename: '' } satisfies FunctionEntry)
      const key = `${entry.name}\u0000${entry.filename}`
      functionEntries.set(key, entry)
      return key
    })
    const leaf = keys[0] ?? '<unsymbolized>\u0000'
    functionEntries.set(
      leaf,
      functionEntries.get(leaf) ?? {
        name: '<unsymbolized>',
        filename: '',
      },
    )
    addCost(flat, leaf, cost)
    for (const key of new Set(keys)) {
      addCost(cumulative, key, cost)
    }
  }

  const rows = (costs: Map<string, number>): Array<FunctionCost> =>
    [...costs]
      .map(([key, value]) => {
        const entry =
          functionEntries.get(key) ??
          fail(`Profile cost references an unknown function.`)
        return {
          ...entry,
          value,
          percentage: percentage(value, total),
        }
      })
      .sort((left, right) => right.value - left.value)

  const flatGroups = new Map<CostGroup, number>()
  const cumulativeGroups = new Map<CostGroup, number>()
  for (const [key, value] of flat) {
    addCost(
      flatGroups,
      costGroup(functionEntries.get(key) ?? { name: key, filename: '' }),
      value,
    )
  }
  for (const value of messageValues(profile, 2)) {
    const fields = decodeFields(value)
    const values = unsignedValues(fields, 2).map(entry =>
      safeNumber(signedValue(entry), 'Sample value'),
    )
    const cost = values[valueIndex] ?? 0
    const groups = new Set(
      unsignedValues(fields, 1).flatMap(locationId =>
        (locations.get(safeNumber(locationId, 'Sample location ID')) ?? []).map(
          functionId =>
            costGroup(
              functions.get(functionId) ?? {
                name: '<unsymbolized>',
                filename: '',
              },
            ),
        ),
      ),
    )
    for (const group of groups) {
      addCost(cumulativeGroups, group, cost)
    }
  }

  const groupRows = (costs: Map<CostGroup, number>) =>
    [...costs]
      .map(([group, value]) => ({
        group,
        value,
        percentage: percentage(value, total),
      }))
      .sort((left, right) => right.value - left.value)

  return {
    compressedBytes: compressedProfile.byteLength,
    compressedSha256: sha256(compressedProfile),
    durationNanos: firstUnsigned(profile, 10, 'Profile duration'),
    period: firstUnsigned(profile, 12, 'Profile period'),
    sampleCount,
    sampleTypes,
    selectedSampleType: sampleTypes[valueIndex],
    total,
    topFlat: rows(flat).slice(0, top),
    topCumulative: rows(cumulative).slice(0, top),
    flatGroups: groupRows(flatGroups),
    cumulativePresenceGroups: groupRows(cumulativeGroups),
    cumulativePresenceNote:
      'A sample may contain several groups, so cumulative presence percentages overlap and need not sum to 100%.',
  }
}

const main = (): void => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { top: { type: 'string', default: '30' } },
  })
  const top = globalThis.Number(values.top)
  if (!globalThis.Number.isSafeInteger(top) || top < 1) {
    return fail(`--top requires a positive integer.`)
  }
  if (positionals.length === 0) {
    return fail(`Provide at least one .pb.gz profile path.`)
  }
  const summaries = positionals.map(path => ({
    path: resolve(path),
    summary: summarizeGoPprof(readFileSync(path), top),
  }))
  process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`)
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  try {
    main()
  } catch (error) {
    process.stderr.write(
      `[summarize-go-pprof] ${
        error instanceof Error ? error.message : globalThis.String(error)
      }\n`,
    )
    process.exitCode = 1
  }
}
