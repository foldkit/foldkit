import { Effect } from 'effect'
import type * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'

import { SaveDraft } from './command.js'
import {
  ApplicationComposition,
  EditorBinding,
  makeUpdate,
} from './composition.js'
import { ApplicationBlock } from './definition.js'
import * as Editor from './editor.js'
import type { ChannelsOf, PlanOutput } from './types.js'
import { editDocument, update } from './update.js'

// @ts-expect-error Story.messageIn is the canonical child-delivery step.
Story.messageFrom

Story.messageIn(
  // @ts-expect-error The direct child delivery does not accept an occurrence key.
  EditorBinding,
  'editor',
  Editor.Message.UpdatedText({ text: 'Edited' }),
)

// @ts-expect-error The delivered Message must belong to the bound child.
Story.messageIn(EditorBinding, ApplicationBlock.Message.CompletedSaveDraft())

type UpdateSource =
  typeof update extends Block.Plan<unknown, 'Update', infer Source>
    ? Source
    : never
type ExactOutput = PlanOutput<typeof update>
type ExactChannels = ChannelsOf<ExactOutput>

// @ts-expect-error A focused update keeps the selected Message payload exact.
makeUpdate.on(['UpdatedTitle'])((model, { text: _text }) => ({ model }))

// @ts-expect-error Shared updates must preserve the owning Model.
makeUpdate.each(() => ({ model: { title: 'Incomplete' } }))

// @ts-expect-error Composition cannot be empty.
makeUpdate.compose()

const focused = makeUpdate.compose(makeUpdate.each(model => ({ model })))
const init = ApplicationComposition.makeInit(() => ({
  model: { title: '', editCount: 0, dispatchCount: 0 },
}))
// @ts-expect-error A focused bundle is not a complete executable update.
ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init,
      update: focused,
    }
  }),
)

// @ts-expect-error A complete update takes a handler record.
makeUpdate((model, _message) => ({ model }))

const erasedOutput: Block.Plan<any, 'Update', UpdateSource> = update
// @ts-expect-error An erased plan output cannot hide handler or emission channels.
makeUpdate.compose(erasedOutput)

const erasedResult: Block.Plan<
  (...args: ReadonlyArray<any>) => any,
  'Update',
  UpdateSource
> = update
// @ts-expect-error The callable result must retain its checked channels.
makeUpdate.compose(erasedResult)

const erasedResultWithChannels: Block.Plan<
  ((...args: ReadonlyArray<any>) => any) &
    Block.OperationOutputs<ExactChannels>,
  'Update',
  UpdateSource
> = update
// @ts-expect-error Channel metadata does not permit an any-returning update.
makeUpdate.compose(erasedResultWithChannels)

const missingChannels: Block.Plan<
  (...args: Parameters<ExactOutput>) => ReturnType<ExactOutput>,
  'Update',
  UpdateSource
> = update
// @ts-expect-error A callable plan cannot erase its per-Message channel metadata.
makeUpdate.compose(missingChannels)

const erasedChannels: Block.Plan<
  ((...args: ReadonlyArray<any>) => unknown) & Block.OperationOutputs<any>,
  'Update',
  UpdateSource
> = update
// @ts-expect-error A callable plan cannot replace exact channels with any.
makeUpdate.compose(erasedChannels)

declare const neverOutput: Block.Plan<never, 'Update', UpdateSource>
// @ts-expect-error A never plan output is not a checked update.
makeUpdate.compose(neverOutput)

declare const neverResult: Block.Plan<
  ((...args: ReadonlyArray<any>) => never) &
    Block.OperationOutputs<ExactChannels>,
  'Update',
  UpdateSource
>
// @ts-expect-error A checked update cannot have an impossible result.
makeUpdate.compose(neverResult)

const erasedFocused: Block.Plan<
  PlanOutput<typeof focused>,
  'Update',
  UpdateSource
> = focused
// @ts-expect-error A focused plan cannot lose the metadata distinguishing it from an anchor.
makeUpdate.compose(erasedFocused)

declare const isEnabled: boolean
const quiet = makeUpdate.each(model => ({ model }))
const selectedAnchor = isEnabled ? editDocument : quiet
// @ts-expect-error Every possible branch must contain at most one complete update.
makeUpdate.compose(editDocument, selectedAnchor)

const maybeCompleted = isEnabled ? makeUpdate.compose(editDocument) : quiet
// @ts-expect-error Completion cannot depend on a conditional missing anchor.
makeUpdate.compose(maybeCompleted)

const repeatedAnchors: ReadonlyArray<typeof editDocument> = [editDocument]
// @ts-expect-error An unbounded spread may add more than one complete update.
makeUpdate.compose(editDocument, ...repeatedAnchors)

const save = makeUpdate.each(model => ({
  model,
  commands: [SaveDraft({ text: model.title })],
}))
const erasedSave: Block.Plan<
  PlanOutput<typeof save>,
  'Update',
  UpdateSource
> = save
declare const selectedErased: typeof erasedSave | typeof quiet
// @ts-expect-error Each alternative must retain its own checked channel metadata.
makeUpdate.compose(editDocument, selectedErased)
