import { Array, Equal, Option, Predicate, String, pipe } from 'effect'

import { MAX_WRONG_CHARS } from '../../constant'

const toNonEmptyStringOption = Option.liftPredicate(String.isNonEmpty)

export const validateUserTextInput = (
  newUserText: string,
  maybeGameText: Option.Option<string>,
): string =>
  pipe(
    toNonEmptyStringOption(newUserText),
    Option.flatMap(() => maybeGameText),
    Option.flatMap(findFirstWrongCharIndex(newUserText)),
    Option.map(firstWrongIndex => {
      const wrongCharCount = String.length(newUserText) - firstWrongIndex
      return wrongCharCount > MAX_WRONG_CHARS
        ? String.slice(0, firstWrongIndex + MAX_WRONG_CHARS)(newUserText)
        : newUserText
    }),
    Option.getOrElse(() => newUserText),
  )

export const findFirstWrongCharIndex =
  (userGameText: string) =>
  (gameText: string): Option.Option<number> =>
    pipe(
      userGameText,
      String.split(''),
      Array.findFirstIndex((char, index) =>
        pipe(
          gameText,
          String.at(index),
          Option.exists(Predicate.not(Equal.equals(char))),
        ),
      ),
    )
