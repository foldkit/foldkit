import { describe, it } from '@effect/vitest'
import { Effect, Fiber } from 'effect'
import { expect } from 'vitest'

import {
  FileReadError,
  mimeType,
  name,
  readAsArrayBuffer,
  readAsDataUrl,
  readAsText,
  select,
  selectMultiple,
  size,
} from './index.js'

const makeTextFile = (contents: string, fileName: string): File =>
  new File([contents], fileName, { type: 'text/plain' })

const makeBinaryFile = (bytes: Uint8Array, fileName: string): File =>
  new File([bytes], fileName, { type: 'application/octet-stream' })

const simulateFileSelection = (input: HTMLInputElement, files: Array<File>) => {
  const dataTransfer = new DataTransfer()
  for (const file of files) {
    dataTransfer.items.add(file)
  }
  input.files = dataTransfer.files
  input.dispatchEvent(new Event('change'))
}

const findHiddenFileInput = (): HTMLInputElement => {
  const inputs = document.querySelectorAll('input[type="file"]')
  const latest = inputs[inputs.length - 1]
  if (!(latest instanceof HTMLInputElement)) {
    throw new Error('Expected a hidden file input to be mounted')
  }
  return latest
}

describe('name / size / mimeType', () => {
  it('returns the file metadata', () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' })
    expect(name(file)).toBe('test.txt')
    expect(size(file)).toBe(11)
    expect(mimeType(file)).toBe('text/plain')
  })

  it('returns an empty mime type when the browser has none', () => {
    const file = new File(['data'], 'unknown.bin')
    expect(mimeType(file)).toBe('')
  })
})

describe('readAsText', () => {
  it.effect('reads the file contents as a UTF-8 string', () =>
    Effect.gen(function* () {
      const file = makeTextFile('hello world', 'greeting.txt')
      const text = yield* readAsText(file)
      expect(text).toBe('hello world')
    }),
  )

  it.effect('handles empty files', () =>
    Effect.gen(function* () {
      const file = makeTextFile('', 'empty.txt')
      const text = yield* readAsText(file)
      expect(text).toBe('')
    }),
  )

  it.effect('fails with FileReadError on an unreadable file', () =>
    Effect.gen(function* () {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const bogus = {} as File
      const error = yield* Effect.flip(readAsText(bogus))
      expect(error).toBeInstanceOf(FileReadError)
    }),
  )
})

describe('readAsDataUrl', () => {
  it.effect('reads the file contents as a data URL', () =>
    Effect.gen(function* () {
      const file = makeTextFile('abc', 'a.txt')
      const dataUrl = yield* readAsDataUrl(file)
      expect(dataUrl.startsWith('data:text/plain')).toBe(true)
      expect(dataUrl).toContain('base64,')
    }),
  )
})

describe('readAsArrayBuffer', () => {
  it.effect('reads the file contents as an ArrayBuffer', () =>
    Effect.gen(function* () {
      const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04])
      const file = makeBinaryFile(bytes, 'raw.bin')
      const buffer = yield* readAsArrayBuffer(file)
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      expect(buffer.byteLength).toBe(4)
      expect(new Uint8Array(buffer)).toEqual(bytes)
    }),
  )
})

describe('select', () => {
  it.effect('mounts a hidden single-select input with the given accept', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(select(['application/pdf']))
      yield* Effect.yieldNow

      const input = findHiddenFileInput()
      expect(input.type).toBe('file')
      expect(input.accept).toBe('application/pdf')
      expect(input.multiple).toBe(false)

      const file = new File(['%PDF-'], 'resume.pdf', {
        type: 'application/pdf',
      })
      simulateFileSelection(input, [file])

      const result = yield* Fiber.join(fiber)
      expect(result).toHaveLength(1)
      expect(name(result[0])).toBe('resume.pdf')
    }),
  )

  it.effect('joins multiple accept values into a comma-separated list', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(
        select(['image/png', 'image/jpeg', 'image/webp']),
      )
      yield* Effect.yieldNow

      const input = findHiddenFileInput()
      expect(input.accept).toBe('image/png,image/jpeg,image/webp')

      simulateFileSelection(input, [])
      yield* Fiber.join(fiber)
    }),
  )

  it.effect('resolves with an empty array when no files are selected', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(select(['*/*']))
      yield* Effect.yieldNow

      const input = findHiddenFileInput()
      simulateFileSelection(input, [])

      const result = yield* Fiber.join(fiber)
      expect(result).toEqual([])
    }),
  )

  it.effect('removes the hidden input from the DOM after resolving', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(select(['*/*']))
      yield* Effect.yieldNow

      const input = findHiddenFileInput()
      expect(input.isConnected).toBe(true)

      simulateFileSelection(input, [])
      yield* Fiber.join(fiber)

      expect(input.isConnected).toBe(false)
    }),
  )
})

describe('selectMultiple', () => {
  it.effect(
    'mounts a hidden multi-select input and resolves with all files',
    () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(selectMultiple(['image/*']))
        yield* Effect.yieldNow

        const input = findHiddenFileInput()
        expect(input.multiple).toBe(true)
        expect(input.accept).toBe('image/*')

        const files = [
          new File(['a'], 'one.png', { type: 'image/png' }),
          new File(['b'], 'two.png', { type: 'image/png' }),
          new File(['c'], 'three.png', { type: 'image/png' }),
        ]
        simulateFileSelection(input, files)

        const result = yield* Fiber.join(fiber)
        expect(result).toHaveLength(3)
        expect(result.map(name)).toEqual(['one.png', 'two.png', 'three.png'])
      }),
  )
})
