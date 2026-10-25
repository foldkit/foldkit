import { Layer, Schema, Stream } from 'effect'
import { Program } from 'foldkit'
import * as LiveQuery from 'foldkit/experimental/liveQuery'

import { ApplicationBlock } from './live-query-block.accepted.js'

export const rejectMissingHandlerService = () => {
  const pending = Program.makeElement({
    block: ApplicationBlock,
    container: null,
  }).provide(Layer.empty)
  // @ts-expect-error The LiveQuery handler requires the BoardEvents Service.
  pending.start()
}

const BoardFeed = LiveQuery.define({
  name: 'RejectedDeclarationBoardFeed',
  state: Schema.String,
  error: Schema.String,
  args: { boardId: Schema.String },
})

// @ts-expect-error A LiveQuery host requires its exact Feeds handler contract.
BoardFeed.provideHandlers(Layer.empty)

LiveQuery.define({
  name: 'RejectedCanonicalBoardFeed',
  state: Schema.String,
  error: Schema.String,
  args: { boardId: Schema.String },
  // @ts-expect-error Entry state must match the LiveQuery state Schema.
  handler: function* () {
    return () => Stream.make({ seq: 1, state: 1 })
  },
})

const CanonicalBoardFeed = LiveQuery.define({
  name: 'RejectedOwnBoardFeed',
  state: Schema.String,
  error: Schema.String,
  args: { boardId: Schema.String },
  handler: function* () {
    return () => Stream.empty
  },
})
const ForeignBoardFeed = LiveQuery.define({
  name: 'RejectedForeignBoardFeed',
  state: Schema.String,
  error: Schema.String,
  args: { boardId: Schema.String },
  handler: function* () {
    return () => Stream.empty
  },
})

// @ts-expect-error A canonical LiveQuery replacement must provide its own Feeds handler.
CanonicalBoardFeed.replaceEffectsLayer(ForeignBoardFeed.EffectsLayer)
