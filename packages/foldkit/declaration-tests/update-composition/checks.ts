import type * as Command from 'foldkit/command'
import { modifyFields } from 'foldkit/struct'
import type * as Update from 'foldkit/update'

import { SaveDraft } from './command.js'
import { makeUpdate } from './composition.js'
import { makeFieldsStep } from './definition.js'
import type { PlanOutput } from './types.js'
import type { ChannelsOf } from './types.js'
import { editDocument, update } from './update.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type ExactCommandRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof update>>,
    | Update.RequirementsOf<PlanOutput<typeof editDocument>>
    | Command.HandlerOf<typeof SaveDraft>
  >
>

export type ExactTitleRequirements = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['UpdatedTitle', unknown, unknown, unknown]
    >[2],
    Command.HandlerOf<typeof SaveDraft>
  >
>

export type RemoteDraftKeepsItsChannels = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['ReceivedDraft', unknown, unknown, unknown]
    >,
    Extract<
      ChannelsOf<PlanOutput<typeof editDocument>>,
      readonly ['ReceivedDraft', unknown, unknown, unknown]
    >
  >
>

makeUpdate.on(['UpdatedTitle'])((model, { title }, { before }) => ({
  model: modifyFields(model, { title: () => `${before.title}:${title}` }),
}))

export const countSelected = makeUpdate.on([
  'UpdatedTitle',
  'CompletedSaveDraft',
])(makeFieldsStep(() => ({ dispatchCount: count => count + 1 })))

export const countExceptRemote = makeUpdate.except(['ReceivedDraft'])(
  makeFieldsStep(() => ({ dispatchCount: count => count + 1 })),
)

makeUpdate.on(['UpdatedTitle'])((model, message) => {
  // @ts-expect-error UpdatedTitle has no text field.
  const text = message.text

  return { model: modifyFields(model, { title: () => String(text) }) }
})

// @ts-expect-error A shared stage must preserve the owning Model.
makeUpdate.each(() => ({ model: { title: 'Incomplete' } }))

// @ts-expect-error The complete update keeps exhaustive record authorship.
makeUpdate((model, _message) => ({ model }))
