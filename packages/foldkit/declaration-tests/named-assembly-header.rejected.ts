import { Schema } from 'effect'
import { Block } from 'foldkit'

import {
  ApplicationBlock,
  HeadlessBlock,
  Message,
  Model,
  ReportingHeadlessBlock,
  ReportingViewedBlock,
  ViewedBlock,
  applicationMessage,
  applicationModel,
} from './named-assembly-header.accepted.js'

declare const anyProducer: any
declare const neverProducer: never
const returnsAny = (): any => ({})
const returnsNever = (): never => {
  throw new Error('never')
}
const forgedProducer = () => ({ Model })
const wrongModel = Schema.Struct({ count: Schema.String })
const WrongModelDefinition = Block.makeDefinition('WrongModelBoundary', {
  Model,
  Message: Schema.Never,
})
const WrongModelComposition = WrongModelDefinition.makeComposition()
const wrongModelProducer = () =>
  WrongModelComposition.prepareBlock({
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: model => ({ model }),
  })

// @ts-expect-error A producer typed as any cannot define the interface boundary.
export interface AnyProducerBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof anyProducer
> {}

interface NeverProducerBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof neverProducer
> {}
// @ts-expect-error A producer typed as never cannot initialize the value boundary.
const NeverProducerBlock: NeverProducerBlock = Block.assemble(neverProducer)

export interface AnyReturnBlock extends Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error A producer returning any cannot define the interface boundary.
  typeof returnsAny
> {}

export interface ForgedProducerBlock extends Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error A structurally forged producer cannot define the interface boundary.
  typeof forgedProducer
> {}

interface NeverReturnBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof returnsNever
> {}
// @ts-expect-error A producer returning never cannot initialize the value boundary.
const NeverReturnBlock: NeverReturnBlock = Block.assemble(returnsNever)

export interface WrongModelBlock extends Block.FromAssemblyWithoutViewOrOutMessage<
  typeof wrongModel,
  // @ts-expect-error The interface must name the producer's exact Model Schema.
  typeof wrongModelProducer
> {}

// @ts-expect-error A viewed Block without OutMessage cannot satisfy the viewed reporting variant.
const wrongViewedOutMessage: ReportingViewedBlock = ViewedBlock

// @ts-expect-error A headless Block cannot satisfy the viewed variant.
const wrongView: ViewedBlock = HeadlessBlock

// @ts-expect-error A headless reporting Block cannot satisfy the no-OutMessage variant.
const wrongHeadlessOutMessage: HeadlessBlock = ReportingHeadlessBlock

// @ts-expect-error A viewed reporting Block cannot satisfy the headless reporting variant.
const wrongHeadlessView: ReportingHeadlessBlock = ReportingViewedBlock

void wrongViewedOutMessage
void wrongView
void wrongHeadlessOutMessage
void wrongHeadlessView

// @ts-expect-error The completed document root retains its operation payload type.
ApplicationBlock.operations.requestRefresh(applicationModel, { count: '2' })

const unboundChildMessage = Message.RequestedIncrement({ count: 2 })
// @ts-expect-error The completed document root rejects an unrelated local child Message.
ApplicationBlock.update(applicationModel, unboundChildMessage)

// @ts-expect-error The direct update does not gain an unconfigured context argument.
ApplicationBlock.update(applicationModel, applicationMessage, {})

// @ts-expect-error The curried update still needs the complete root Model.
ApplicationBlock.update(applicationMessage)(ViewedBlock.init().model)
