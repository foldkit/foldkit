import {
  Array,
  Effect,
  Equal,
  Option,
  Predicate,
  String as Str,
  pipe,
} from 'effect'

import { MAX_WRONG_CHARS } from '../../constant'

const toNonEmptyStringOption = Option.liftPredicate(Str.isNonEmpty)

export const validateUserTextInput = (
  newUserText: string,
  maybeGameText: Option.Option<string>,
): string =>
  Effect.gen(function* () {
    yield* toNonEmptyStringOption(newUserText)
    const gameText = yield* maybeGameText
    const firstWrongIndex =
      yield* findFirstWrongCharIndex(newUserText)(gameText)

    const wrongCharCount = Str.length(newUserText) - firstWrongIndex
    const exceedsMaxWrongChars = wrongCharCount > MAX_WRONG_CHARS

    return exceedsMaxWrongChars
      ? Str.slice(0, firstWrongIndex + MAX_WRONG_CHARS)(newUserText)
      : newUserText
  }).pipe(
    Effect.catchAll(() => Effect.succeed(newUserText)),
    Effect.runSync,
  )

export const findFirstWrongCharIndex =
  (userGameText: string) =>
  (gameText: string): Option.Option<number> =>
    pipe(
      userGameText,
      Str.split(''),
      Array.findFirstIndex((char, index) =>
        pipe(
          gameText,
          Str.at(index),
          Option.exists(Predicate.not(Equal.equals(char))),
        ),
      ),
    )
