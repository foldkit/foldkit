import { Effect, Queue, Stream } from 'effect'

/** A parsed key press from raw terminal input. */
export type KeyPress = Readonly<{
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}>

const noModifiers = { ctrl: false, shift: false, alt: false } as const

const parseKeyPress = (data: Buffer): KeyPress => {
  const hex = data.toString('hex')
  const str = data.toString('utf8')

  if (hex === '1b5b41') {
    return { key: 'ArrowUp', ...noModifiers }
  }
  if (hex === '1b5b42') {
    return { key: 'ArrowDown', ...noModifiers }
  }
  if (hex === '1b5b43') {
    return { key: 'ArrowRight', ...noModifiers }
  }
  if (hex === '1b5b44') {
    return { key: 'ArrowLeft', ...noModifiers }
  }
  if (hex === '0d' || hex === '0a') {
    return { key: 'Enter', ...noModifiers }
  }
  if (hex === '1b') {
    return { key: 'Escape', ...noModifiers }
  }
  if (hex === '7f' || hex === '08') {
    return { key: 'Backspace', ...noModifiers }
  }
  if (hex === '09') {
    return { key: 'Tab', ...noModifiers }
  }
  if (hex === '20') {
    return { key: ' ', ...noModifiers }
  }

  const firstByte = data[0]
  if (data.length === 1 && firstByte !== undefined && firstByte < 27) {
    return {
      key: String.fromCharCode(firstByte + 96),
      ctrl: true,
      shift: false,
      alt: false,
    }
  }

  return { key: str, ...noModifiers }
}

/**
 * A `Stream` of key presses read from `process.stdin` in raw mode.
 *
 * Acquires raw mode and a `data` listener on subscription, and tears them
 * down on stream completion. `Ctrl+C` short-circuits to `process.exit(0)`
 * so users can always abort.
 */
export const keyPressStream = (): Stream.Stream<KeyPress> =>
  Stream.callback<KeyPress>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        const onData = (data: Buffer) => {
          const keyPress = parseKeyPress(
            Buffer.isBuffer(data) ? data : Buffer.from(data),
          )

          if (keyPress.ctrl && keyPress.key === 'c') {
            process.exit(0)
          }

          Queue.offerUnsafe(queue, keyPress)
        }

        process.stdin.on('data', onData)
        return onData
      }),
      onData =>
        Effect.sync(() => {
          process.stdin.removeListener('data', onData)
          process.stdin.setRawMode(false)
          process.stdin.pause()
        }),
    ),
  )
