import { HashSet, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { toInspectableValue, toSerializedEntry } from './serialize.js'
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
    commandNames: ['SubmitForm'],
    timestamp: 1700000000000,
    isModelChanged: true,
    diff: {
      changedPaths: HashSet.fromIterable(['root.count', 'root.name']),
      affectedPaths: HashSet.fromIterable(['root.count', 'root.name', 'root']),
    },
  }

  it('preserves the tag, commandNames, timestamp, and isModelChanged fields', () => {
    const result = toSerializedEntry(baseEntry, 7)
    expect(result.index).toBe(7)
    expect(result.tag).toBe('ClickedButton')
    expect(result.commandNames).toEqual(['SubmitForm'])
    expect(result.timestamp).toBe(1700000000000)
    expect(result.isModelChanged).toBe(true)
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
