import {
  BigDecimal,
  Chunk,
  Equal,
  Hash,
  HashSet,
  Option,
  Redacted,
  Schema,
} from 'effect'
import { describe, expect, it } from 'vitest'

import {
  toInspectableValue,
  toSerializedEntry,
  toSerializedMount,
} from './serialize.js'
import type { HistoryEntry } from './store.js'

describe('toInspectableValue', () => {
  it('converts a Date to its ISO string', () => {
    const date = new Date('2026-04-26T12:00:00.000Z')
    expect(toInspectableValue(date)).toBe('2026-04-26T12:00:00.000Z')
  })

  it('converts a URL to its href string', () => {
    const url = new URL('https://example.com/path?q=1')
    expect(toInspectableValue(url)).toBe('https://example.com/path?q=1')
  })

  it('converts a File to a plain object with name, size, type, lastModified', () => {
    const file = new File(['hello'], 'greeting.txt', {
      type: 'text/plain',
      lastModified: 1700000000000,
    })
    expect(toInspectableValue(file)).toEqual({
      name: 'greeting.txt',
      size: 5,
      type: 'text/plain',
      lastModified: 1700000000000,
    })
  })

  it('converts a Blob to a plain object with size and type', () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    expect(toInspectableValue(blob)).toEqual({
      size: 11,
      type: 'text/plain',
    })
  })

  it('recurses into arrays', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    expect(toInspectableValue([1, date, 'a'])).toEqual([
      1,
      '2026-01-01T00:00:00.000Z',
      'a',
    ])
  })

  it('recurses into records', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    expect(toInspectableValue({ count: 3, when: date })).toEqual({
      count: 3,
      when: '2026-01-01T00:00:00.000Z',
    })
  })

  it('replaces nested Redacted values with their labeled placeholders', () => {
    const apiKey = 'sk-live-not-for-devtools'
    const model = {
      connection: {
        apiKey: Redacted.make(apiKey, { label: 'demo-api-key' }),
      },
      credentials: [Redacted.make('refresh-token')],
    }

    const result = toInspectableValue(model)

    expect(result).toEqual({
      connection: { apiKey: '<redacted:demo-api-key>' },
      credentials: ['<redacted>'],
    })
    expect(JSON.stringify(result)).not.toContain(apiKey)
  })

  it('preserves primitives unchanged', () => {
    expect(toInspectableValue(42)).toBe(42)
    expect(toInspectableValue('hi')).toBe('hi')
    expect(toInspectableValue(null)).toBe(null)
    expect(toInspectableValue(undefined)).toBe(undefined)
    expect(toInspectableValue(true)).toBe(true)
  })

  it('handles deeply nested mixes', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    const url = new URL('https://example.com')
    expect(
      toInspectableValue({
        items: [{ created: date }, { link: url }],
      }),
    ).toEqual({
      items: [
        { created: '2026-01-01T00:00:00.000Z' },
        { link: 'https://example.com/' },
      ],
    })
  })

  it('converts a Chunk to an array of its converted elements', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    expect(
      toInspectableValue({
        empty: Chunk.empty(),
        singleton: Chunk.of(date),
        concatenated: Chunk.appendAll(Chunk.of(1), Chunk.of(2)),
        sliced: Chunk.drop(Chunk.make(1, 2, 3), 1),
        log: Chunk.make({ created: date }, { id: 2 }),
      }),
    ).toEqual({
      empty: [],
      singleton: ['2026-01-01T00:00:00.000Z'],
      concatenated: [1, 2],
      sliced: [2, 3],
      log: [{ created: '2026-01-01T00:00:00.000Z' }, { id: 2 }],
    })
  })

  it('formats fresh, normalized, formatted, compared, and hashed BigDecimals', () => {
    const fresh = BigDecimal.fromStringUnsafe('14.270')
    const normalized = BigDecimal.normalize(
      BigDecimal.fromStringUnsafe('15.280'),
    )
    const formatted = BigDecimal.fromStringUnsafe('16.290')
    BigDecimal.format(formatted)
    const compared = BigDecimal.fromStringUnsafe('17.300')
    Equal.equals(compared, BigDecimal.fromStringUnsafe('17.3'))
    const hashed = BigDecimal.fromStringUnsafe('18.310')
    Hash.hash(hashed)

    expect(
      toInspectableValue({ fresh, normalized, formatted, compared, hashed }),
    ).toEqual({
      fresh: '14.27',
      normalized: '15.28',
      formatted: '16.29',
      compared: '17.3',
      hashed: '18.31',
    })
  })

  it('inspects Schema.BigDecimal fields without mutating decimal instances', () => {
    const Model = Schema.Struct({
      amount: Schema.BigDecimal,
      frozen: Schema.BigDecimal,
    })
    const amount = BigDecimal.fromStringUnsafe('14.270')
    const originalProperties = Object.getOwnPropertyDescriptors(amount)
    const frozen = Object.freeze(BigDecimal.fromStringUnsafe('15.280'))
    const model = Object.freeze(Model.make({ amount, frozen }))

    expect(toInspectableValue(model)).toEqual({
      amount: '14.27',
      frozen: '15.28',
    })
    expect(Object.getOwnPropertyDescriptors(amount)).toEqual(originalProperties)
  })

  it('masks Redacted values nested inside Chunk elements', () => {
    const secret = 'private-inspection-fixture'
    const hidden = Redacted.make({ secret }, { label: 'session' })
    const result = toInspectableValue(
      Chunk.make(
        { amount: BigDecimal.fromStringUnsafe('14.27'), hidden },
        hidden,
      ),
    )

    expect(result).toEqual([
      { amount: '14.27', hidden: '<redacted:session>' },
      '<redacted:session>',
    ])
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('replaces object and array ancestor cycles with bounded placeholders', () => {
    const record: Record<string, unknown> = { label: 'root' }
    record['self'] = record
    const array: Array<unknown> = []
    array.push(array)

    const result = toInspectableValue({ record, array })

    expect(result).toEqual({
      record: { label: 'root', self: '[Circular]' },
      array: ['[Circular]'],
    })
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  it('reuses completed conversions for shared acyclic children', () => {
    const shared = { label: 'shared' }
    const result = Schema.decodeUnknownSync(
      Schema.Struct({ left: Schema.Unknown, right: Schema.Unknown }),
    )(toInspectableValue({ left: shared, right: shared }))
    const converted = toInspectableValue(shared)

    expect(converted).toEqual({ label: 'shared' })
    expect(result.left).toBe(converted)
    expect(result.right).toBe(converted)
  })

  it('keeps mutually cyclic values bounded when a cached child becomes the root', () => {
    const parent: Record<string, unknown> = { label: 'parent' }
    const child: Record<string, unknown> = { label: 'child', parent }
    parent['child'] = child

    const parentResult = toInspectableValue(parent)
    const childResult = toInspectableValue(child)

    expect(parentResult).toMatchObject({ label: 'parent' })
    expect(childResult).toMatchObject({ label: 'child' })
    expect(JSON.stringify(parentResult)).toContain('[Circular]')
    expect(JSON.stringify(childResult)).toContain('[Circular]')
    expect(toInspectableValue(parent)).toBe(parentResult)
    expect(toInspectableValue(child)).toBe(childResult)
  })

  it('preserves own __proto__ data on null-prototype records with symbol cycles', () => {
    const record: Record<string, unknown> = Object.create(null)
    const hidden = Symbol('hidden')
    Object.defineProperty(record, '__proto__', {
      value: { amount: BigDecimal.fromStringUnsafe('14.27') },
      enumerable: true,
    })
    Object.defineProperty(record, hidden, { value: record, enumerable: true })

    const result = toInspectableValue(record)

    expect(Object.getOwnPropertyDescriptor(result, '__proto__')?.value).toEqual(
      { amount: '14.27' },
    )
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      ['__proto__']: { amount: '14.27' },
    })
  })

  it('can inspect a value again after an earlier conversion throws', () => {
    const record: Record<string, unknown> = {}
    Object.defineProperty(record, 'value', {
      get: () => {
        throw new Error('Value is unavailable')
      },
      enumerable: true,
      configurable: true,
    })

    expect(() => toInspectableValue(record)).toThrow('Value is unavailable')

    Object.defineProperty(record, 'value', {
      value: 'available',
      enumerable: true,
      configurable: true,
    })

    expect(toInspectableValue(record)).toEqual({ value: 'available' })
  })

  it('returns the same reference when called twice with the same input', () => {
    const input = { items: [{ id: 1 }, { id: 2 }] }
    const first = toInspectableValue(input)
    const second = toInspectableValue(input)
    expect(first).toBe(second)
  })
})

describe('toSerializedEntry', () => {
  const baseEntry: HistoryEntry = {
    tag: 'ClickedButton',
    message: { _tag: 'ClickedButton', label: 'Submit' },
    commands: [{ id: 0, name: 'SubmitForm', maybeSubmodelPath: Option.none() }],
    mountStarts: [],
    mountEnds: [],
    timestamp: 1700000000000,
    isModelChanged: true,
    diff: {
      changedPaths: HashSet.fromIterable(['root.count', 'root.name']),
      affectedPaths: HashSet.fromIterable(['root.count', 'root.name', 'root']),
    },
  }

  it('preserves the tag, commands, timestamp, and isModelChanged fields', () => {
    const result = toSerializedEntry(baseEntry, 7)
    expect(result.index).toBe(7)
    expect(result.tag).toBe('ClickedButton')
    expect(result.commands).toEqual([
      {
        name: 'SubmitForm',
        args: Option.none(),
        maybeSubmodelPath: Option.none(),
      },
    ])
    expect(result.timestamp).toBe(1700000000000)
    expect(result.isModelChanged).toBe(true)
  })

  it('serializes Command args alongside the name', () => {
    const entryWithArgs: HistoryEntry = {
      ...baseEntry,
      commands: [
        {
          id: 1,
          name: 'FetchWeather',
          args: { zipCode: '90210' },
          maybeSubmodelPath: Option.some(['GotForecastMessage']),
        },
        {
          id: 2,
          name: 'LockScroll',
          maybeSubmodelPath: Option.some([]),
        },
      ],
    }
    const result = toSerializedEntry(entryWithArgs, 0)
    expect(result.commands).toEqual([
      {
        name: 'FetchWeather',
        args: Option.some({ zipCode: '90210' }),
        maybeSubmodelPath: Option.some(['GotForecastMessage']),
      },
      {
        name: 'LockScroll',
        args: Option.none(),
        maybeSubmodelPath: Option.some([]),
      },
    ])
  })

  it('serializes Mount args alongside the name', () => {
    const entryWithMounts: HistoryEntry = {
      ...baseEntry,
      mountStarts: [
        { name: 'AnchorPopover', args: { buttonId: 'cart-button' } },
        { name: 'PortalPopoverBackdrop' },
      ],
      mountEnds: [{ name: 'AnchorPopover', args: { buttonId: 'cart-button' } }],
    }
    const result = toSerializedEntry(entryWithMounts, 0)
    expect(result.mountStarts).toEqual([
      { name: 'AnchorPopover', args: Option.some({ buttonId: 'cart-button' }) },
      { name: 'PortalPopoverBackdrop', args: Option.none() },
    ])
    expect(result.mountEnds).toEqual([
      { name: 'AnchorPopover', args: Option.some({ buttonId: 'cart-button' }) },
    ])
  })

  it('replaces Redacted values in Command and Mount args', () => {
    const apiKey = 'sk-live-not-for-devtools'
    const entryWithSecretArgs: HistoryEntry = {
      ...baseEntry,
      commands: [
        {
          id: 1,
          name: 'Connect',
          args: { apiKey: Redacted.make(apiKey, { label: 'demo-api-key' }) },
          maybeSubmodelPath: Option.none(),
        },
      ],
      mountStarts: [
        {
          name: 'ConnectForm',
          args: { apiKey: Redacted.make(apiKey, { label: 'demo-api-key' }) },
        },
      ],
    }

    const result = toSerializedEntry(entryWithSecretArgs, 0)

    expect(result.commands).toEqual([
      {
        name: 'Connect',
        args: Option.some({ apiKey: '<redacted:demo-api-key>' }),
        maybeSubmodelPath: Option.none(),
      },
    ])
    expect(result.mountStarts).toEqual([
      {
        name: 'ConnectForm',
        args: Option.some({ apiKey: '<redacted:demo-api-key>' }),
      },
    ])
    expect(JSON.stringify(result)).not.toContain(apiKey)
  })

  it('flattens the diff HashSets to plain string arrays', () => {
    const result = toSerializedEntry(baseEntry, 0)
    expect(new Set(result.changedPaths)).toEqual(
      new Set(['root.count', 'root.name']),
    )
    expect(new Set(result.affectedPaths)).toEqual(
      new Set(['root.count', 'root.name', 'root']),
    )
  })

  it('passes the message through toInspectableValue, converting Dates to ISO strings', () => {
    const date = new Date('2026-04-26T12:00:00.000Z')
    const entryWithDate: HistoryEntry = {
      ...baseEntry,
      message: { _tag: 'TickedClock', at: date },
    }
    const result = toSerializedEntry(entryWithDate, 0)
    expect(result.message).toEqual({
      _tag: 'TickedClock',
      at: '2026-04-26T12:00:00.000Z',
    })
  })

  it('replaces nested Redacted values in Message payloads', () => {
    const apiKey = 'sk-live-not-for-devtools'
    const entryWithSecret: HistoryEntry = {
      ...baseEntry,
      message: {
        _tag: 'SubmittedConnection',
        connection: {
          apiKey: Redacted.make(apiKey, { label: 'demo-api-key' }),
        },
      },
    }

    const result = toSerializedEntry(entryWithSecret, 0)

    expect(result.message).toEqual({
      _tag: 'SubmittedConnection',
      connection: { apiKey: '<redacted:demo-api-key>' },
    })
    expect(JSON.stringify(result)).not.toContain(apiKey)
  })

  it('serializes Files in the message body to plain objects', () => {
    const file = new File(['hi'], 'note.txt', {
      type: 'text/plain',
      lastModified: 1700000000000,
    })
    const entryWithFile: HistoryEntry = {
      ...baseEntry,
      message: { _tag: 'UploadedFile', file },
    }
    const result = toSerializedEntry(entryWithFile, 0)
    expect(result.message).toEqual({
      _tag: 'UploadedFile',
      file: {
        name: 'note.txt',
        size: 2,
        type: 'text/plain',
        lastModified: 1700000000000,
      },
    })
  })

  it('produces a JSON-serializable result', () => {
    const date = new Date('2026-04-26T12:00:00.000Z')
    const file = new File(['hi'], 'note.txt')
    const entry: HistoryEntry = {
      ...baseEntry,
      message: { _tag: 'Mixed', date, file, count: 7 },
    }
    const result = toSerializedEntry(entry, 5)
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  it('handles entries with empty diffs', () => {
    const entry: HistoryEntry = {
      ...baseEntry,
      isModelChanged: false,
      diff: {
        changedPaths: HashSet.empty(),
        affectedPaths: HashSet.empty(),
      },
    }
    const result = toSerializedEntry(entry, 0)
    expect(result.changedPaths).toEqual([])
    expect(result.affectedPaths).toEqual([])
    expect(result.isModelChanged).toBe(false)
  })

  it('leaves submodelPath empty and maybeLeafTag None for top-level Messages', () => {
    const result = toSerializedEntry(baseEntry, 0)
    expect(result.submodelPath).toEqual([])
    expect(result.maybeLeafTag).toEqual(Option.none())
  })

  it('extracts the submodel chain and leaf tag for Got*Message entries', () => {
    const entry: HistoryEntry = {
      ...baseEntry,
      tag: 'GotProductsMessage',
      message: {
        _tag: 'GotProductsMessage',
        message: { _tag: 'ClickedRow', index: 2 },
      },
    }
    const result = toSerializedEntry(entry, 0)
    expect(result.submodelPath).toEqual(['GotProductsMessage'])
    expect(result.maybeLeafTag).toEqual(Option.some('ClickedRow'))
  })
})

describe('toSerializedMount', () => {
  it('wraps absent args in Option.none', () => {
    expect(toSerializedMount({ name: 'FocusInput' })).toEqual({
      name: 'FocusInput',
      args: Option.none(),
    })
  })

  it('wraps a present args record in Option.some', () => {
    expect(
      toSerializedMount({
        name: 'AnchorPopover',
        args: { buttonId: 'cart-button', anchor: { placement: 'bottom' } },
      }),
    ).toEqual({
      name: 'AnchorPopover',
      args: Option.some({
        buttonId: 'cart-button',
        anchor: { placement: 'bottom' },
      }),
    })
  })

  it('treats an empty args record as Some({}), distinct from absent args', () => {
    expect(toSerializedMount({ name: 'EmptyArgs', args: {} })).toEqual({
      name: 'EmptyArgs',
      args: Option.some({}),
    })
  })
})
