import { Schema } from 'effect'
import { Block } from 'foldkit'

export const RenderedChildModel = Schema.Struct({ value: Schema.String })
export const RenderedChildKey = Symbol('RecordCompletionRenderedChild')
export const RenderedChild = Block.make('RecordCompletionRenderedChild', {
  key: RenderedChildKey,
  Model: RenderedChildModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ label: string }>(),
  },
})
export const RenderedChildComposition = RenderedChild.makeComposition()
export const renderedChildInit = RenderedChildComposition.makeInit(() => ({
  model: RenderedChildModel.make({ value: 'child' }),
}))
export const renderedChildUpdate = RenderedChildComposition.makeUpdate({})
export const renderedChildView = RenderedChildComposition.makeView.withInputs(
  (model, { label }, h) => h.span([], [`${label}: ${model.value}`]),
)

export const RenderedParentModel = Schema.Struct({
  primary: RenderedChildModel,
  secondary: RenderedChildModel,
})
export const RenderedParentKey = Symbol('RecordCompletionRenderedParent')
export const RenderedParent = Block.make('RecordCompletionRenderedParent', {
  key: RenderedParentKey,
  Model: RenderedParentModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const PrimaryRenderedBinding = RenderedParent.makeRequiredFieldBinding(
  RenderedChild,
  { field: 'primary' },
)
export const SecondaryRenderedBinding = RenderedParent.makeRequiredFieldBinding(
  RenderedChild,
  {
    field: 'secondary',
  },
)
export const RenderedParentComposition = RenderedParent.makeComposition({
  bindings: [PrimaryRenderedBinding, SecondaryRenderedBinding],
})
export const renderedParentInit = RenderedParentComposition.makeInit(() => ({
  model: {},
}))
export const renderedParentUpdate = RenderedParentComposition.makeUpdate({})
export const importedRecordView = RenderedParentComposition.makeView(
  (model, h) =>
    h.block(
      PrimaryRenderedBinding.embedView({
        slotId: 'imported-primary',
        model: model.primary,
        view: renderedChildView,
        viewInputs: { label: 'Primary' },
      }),
    ),
)
