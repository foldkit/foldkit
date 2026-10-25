import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'

const Model = Schema.Struct({ count: Schema.Number })
const Composition = Block.makeDefinition('HeaderChild', { Model }).makeComposition()
const prepareChild = () => Composition.prepareBlock({})
export const HeaderChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareChild
> = Block.assemble(prepareChild)

const prepareInterface = () => Composition.prepareBlock({})
export interface InterfaceHeader
  extends Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareInterface
  > {}
export const InterfaceHeader: InterfaceHeader = Block.assemble(prepareInterface)

const prepareInferred = () => Composition.prepareBlock({})
export const InferredChild = Block.assemble(prepareInferred)

export const WidenedHeader: typeof HeaderChild = HeaderChild
export const CastHeader = HeaderChild as typeof HeaderChild
export const InferredModel = InferredChild.Model
const prepareBad = () => Composition.prepareBlock({})
export const InferredModelHeader: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof InferredModel,
  typeof prepareBad
> = Block.assemble(prepareBad)

const WidenedModel = (HeaderChild as typeof HeaderChild).Model
const prepareWidenedModel = () => Composition.prepareBlock({})
export const WidenedModelHeader: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof WidenedModel,
  typeof prepareWidenedModel
> = Block.assemble(prepareWidenedModel)

export const ProvidedHeader = HeaderChild.provideHandlers(Layer.empty)
export const ReplacedHeader = HeaderChild.replaceEffectsLayer(Layer.empty)
export const ProvidedInferred = InferredChild.provideHandlers(Layer.empty)
export const ReplacedInferred = InferredChild.replaceEffectsLayer(Layer.empty)
