import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { Url } from 'foldkit/url'

export const LegacyViewKey = Symbol('LegacyRequiredView')
const Legacy = Block.makeDefinition('LegacyRequiredView', {
  key: LegacyViewKey,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Schema.Struct({ label: Schema.String }) },
})
const LegacyComposition = Legacy.makeComposition()
const implementation = Legacy.makeBlock(Effect.succeed({
  children: [],
  init: LegacyComposition.makeInit(() => ({ model: 7 })),
  update: LegacyComposition.makeUpdate({}),
  view: LegacyComposition.makeView.withInputs((model, inputs, h) => h.div([], [`${inputs.label}: ${model}`])),
}))
export const legacyScene = Scene.scene({ block: implementation, viewInputs: { label: 'Count' } }, Scene.init())
export type LegacyTestBlock = Story.TestBlock<typeof implementation>
export const legacyUse = Story.withBlock(implementation, (block: LegacyTestBlock) => block.init())

export const SelectedViewKey = Symbol('SelectedRequiredView')
const Selected = Block.make('SelectedRequiredView', {
  key: SelectedViewKey,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Schema.Struct({ label: Schema.String }) },
})
const SelectedComposition = Selected.makeComposition()
const layer = Selected.makeLayer(Effect.succeed({
  children: [],
  init: SelectedComposition.makeInit(() => ({ model: 9 })),
  update: SelectedComposition.makeUpdate({}),
  view: SelectedComposition.makeView.withInputs((model, inputs, h) => h.div([], [`${inputs.label}: ${model}`])),
}))
const application = { block: Selected, layer }
export type SelectedTestBlock = Story.TestBlock<typeof application>
export const selectedUse = Story.withBlock(application, (block: SelectedTestBlock) => block.init())
export const inferredLowLevelStory = Story.withBlock(application, executable => {
  Story.story(executable.update, Story.given(executable.init().model), Story.model(model => {
    model.toFixed()
    // @ts-expect-error Inferred low-level Story Model retains number.
    model.trim()
  }))
})
export const selectedScene = Scene.scene({ ...application, viewInputs: { label: 'Selected' } }, Scene.init())
export const selectedRoutedScene = Scene.scene({
  ...application,
  viewInputs: { label: 'Selected' },
  routing: { onUrlChange: url => { const exactUrl: Url = url; throw new Error(exactUrl.pathname) } },
}, Scene.init())

if (false) {
  // @ts-expect-error The legacy view still requires its precise inputs.
  Scene.scene({ block: implementation, viewInputs: { label: 1 } }, Scene.init())
  // @ts-expect-error Required legacy view inputs cannot be omitted.
  Scene.scene({ block: implementation }, Scene.init())
  // @ts-expect-error The selected view still requires its precise inputs.
  Scene.scene({ ...application, viewInputs: { label: 1 } }, Scene.init())
  // @ts-expect-error Required selected view inputs cannot be omitted.
  Scene.scene(application, Scene.init())
}

export const inferredHighLevelStory = Story.story(implementation, Story.init(), Story.model(model => {
  model.toFixed()
  // @ts-expect-error Inferred high-level Story Model retains number.
  model.trim()
}))
const lowLevelUpdate = (model: number, message: string) => ({ model: model + message.length })
export const explicitLowLevelStory = () => Story.story<number, string>(lowLevelUpdate, Story.given(0), Story.message('one'), Story.model(model => model.toFixed()))
export const genericLowLevelStory = <Model, Message>(
  update: (model: Model, message: Message) => Readonly<{ model: Model }>,
  initial: Model,
  message: Message,
) => Story.story(update, Story.given(initial), Story.message(message), Story.model(model => { const exact: Model = model; void exact }))

if (false) {
  // @ts-expect-error Low-level Story only accepts an update result.
  Story.story((model: number, message: string) => message, Story.given(0))
  // @ts-expect-error Low-level Story retains its Message input.
  Story.story(lowLevelUpdate, Story.given(0), Story.message(1))
}
