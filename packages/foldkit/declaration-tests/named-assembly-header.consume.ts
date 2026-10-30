import {
  ApplicationBlock,
  type ApplicationBoundaryAssertions,
  type ExactBoundaryAssertions,
  ReportingViewedBlock,
  ViewedBlock,
  applicationMessage,
  applicationModel,
  makeApplication,
} from './named-assembly-header.barrel.js'

const consumesApplicationType: ApplicationBlock = ApplicationBlock
const consumesApplicationOperation = ApplicationBlock.operations.requestRefresh(
  applicationModel,
  { count: 3 },
)
const consumesApplicationUpdate = ApplicationBlock.update(
  applicationModel,
  applicationMessage,
)
const consumesApplication =
  ApplicationBlock.update(applicationMessage)(applicationModel)
const consumesApplicationEncodedModel: typeof ApplicationBlock.Model.Encoded = {
  child: { count: '3' },
}
const consumesDocumentProgram = makeApplication

const consumesType: ViewedBlock = ViewedBlock
const consumesValue = ViewedBlock.operations.requestIncrement(
  ViewedBlock.init().model,
  { count: 3 },
)
const consumesOutMessage = ReportingViewedBlock.OutMessage.ReportedCount({
  count: 3,
})
const consumesEncodedModel: typeof ViewedBlock.Model.Encoded = {
  count: '3',
}

export {
  consumesApplicationEncodedModel,
  consumesApplicationOperation,
  consumesApplication as consumesApplicationStep,
  consumesApplicationType,
  consumesApplicationUpdate,
  consumesDocumentProgram,
  consumesEncodedModel,
  consumesOutMessage,
  consumesType,
  consumesValue,
}
export type { ApplicationBoundaryAssertions, ExactBoundaryAssertions }
