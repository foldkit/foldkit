import { Array, Duration, Option, Result, Schema, pipe } from 'effect'
import { FieldValidation } from 'foldkit'

import { Note, NoteDuration } from './block'

export const NOTE_FREQUENCIES: Record<Note, number> = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
}

export const DURATION_MILLISECONDS: Record<NoteDuration, number> = {
  Short: 200,
  Medium: 400,
  Long: 800,
}

export const PHASE_DURATION: Duration.Input = '150 millis'
export const MIN_NOTES = 2
export const MAX_NOTES = 8

const noteInputRules = FieldValidation.makeRules({
  required: 'Enter some notes',
  rules: [
    FieldValidation.Rule.pattern(/^[A-G]+$/, 'Use notes A through G'),
    FieldValidation.Rule.minLength(
      MIN_NOTES,
      `Enter at least ${MIN_NOTES} notes`,
    ),
    FieldValidation.Rule.maxLength(
      MAX_NOTES,
      `Enter at most ${MAX_NOTES} notes`,
    ),
  ],
})

export const validateNoteInput = FieldValidation.validate(noteInputRules)

export const parseNotes = (value: string) =>
  pipe(
    value,
    Array.fromIterable,
    Array.filterMap(character => {
      const decoded = Schema.decodeUnknownOption(Note)(character)
      return Option.match(decoded, {
        onNone: () => Result.failVoid,
        onSome: Result.succeed,
      })
    }),
  )
export const INITIAL_NOTE_SEQUENCE = 'CDEFGABC'
