import { Option, Schema, pipe } from 'effect'

import { isBlockMessage } from '../blocks/engine.js'

const Tagged = Schema.Struct({ _tag: Schema.String })
type Tagged = typeof Tagged.Type
export const isTagged = Schema.is(Tagged)

/** Block instance information extracted from a recorded Message. */
export type BlockInfo = Readonly<{
  blockPath: ReadonlyArray<string>
  maybeLeafTag: Option.Option<string>
}>

/**
 * Return the instance path and inner Message tag of a recorded Message.
 *
 * A Block program delivers a child instance's Message as
 * `{ _tag: 'BlockMessage', path, message }`, where `path` lists the instance
 * ids from the root to the child, with a keyed collection instance addressed
 * by its collection name and key. For such a Message, `blockPath` is that
 * path and `maybeLeafTag` is `Some` with the child Message tag when the child
 * Message is tagged.
 *
 * Returns an empty path and `Option.none` for the root Block's own Messages.
 */
export const extractBlockInfo = (_tag: string, message: unknown): BlockInfo => {
  if (!isBlockMessage(message)) {
    return { blockPath: [], maybeLeafTag: Option.none() }
  }

  return {
    blockPath: message.path,
    maybeLeafTag: pipe(
      message.message,
      Option.liftPredicate(isTagged),
      Option.map(({ _tag }) => _tag),
    ),
  }
}
