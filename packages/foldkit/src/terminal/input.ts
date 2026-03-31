import { Effect, Stream } from 'effect'

/** A parsed key press from raw terminal input. */
export type KeyPress = Readonly<{
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}>

/** Parse raw stdin bytes into a KeyPress. */
export const parseKeyPress = (data: Buffer): KeyPress => {
  const hex = data.toString('hex')
  const str = data.toString('utf8')

  if (hex === '1b5b41') {
    return { key: 'ArrowUp', ctrl: false, shift: false, alt: false }
  }
  if (hex === '1b5b42') {
    return { key: 'ArrowDown', ctrl: false, shift: false, alt: false }
  }
  if (hex === '1b5b43') {
    return { key: 'ArrowRight', ctrl: false, shift: false, alt: false }
  }
  if (hex === '1b5b44') {
    return { key: 'ArrowLeft', ctrl: false, shift: false, alt: false }
  }

  if (hex === '0d' || hex === '0a') {
    return { key: 'Enter', ctrl: false, shift: false, alt: false }
  }
  if (hex === '1b') {
    return { key: 'Escape', ctrl: false, shift: false, alt: false }
  }
  if (hex === '7f' || hex === '08') {
    return { key: 'Backspace', ctrl: false, shift: false, alt: false }
  }
  if (hex === '09') {
    return { key: 'Tab', ctrl: false, shift: false, alt: false }
  }
  if (hex === '20') {
    return { key: ' ', ctrl: false, shift: false, alt: false }
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

  return { key: str, ctrl: false, shift: false, alt: false }
}

/** Create an Effect Stream of key presses from stdin. Enables raw mode. */
export const keyPressStream = (): Stream.Stream<KeyPress> =>
  Stream.asyncScoped<KeyPress>(emit =>
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

          emit.single(keyPress)
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
