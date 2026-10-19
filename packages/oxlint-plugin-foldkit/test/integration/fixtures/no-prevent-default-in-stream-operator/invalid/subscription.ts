import { Effect, Stream } from 'effect'

import { Message } from './message'

const handleKeyboardEvent = (keyboardEvent: KeyboardEvent) =>
  Effect.sync(() => keyboardEvent.preventDefault()).pipe(
    Effect.as(Message.PressedKey({ key: keyboardEvent.key })),
  )

export const keyboard = Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
  Stream.mapEffect(handleKeyboardEvent),
)
