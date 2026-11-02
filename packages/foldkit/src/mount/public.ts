declare const HandlerTypeId: unique symbol

/** The service required by a Mount whose implementation is supplied by a Layer. */
export interface Handler<Name extends string, Input, ResultMessage> {
  readonly [HandlerTypeId]: Readonly<{
    name: Name
    input: (input: Input) => Input
    result: (result: ResultMessage) => ResultMessage
  }>
}

export type {
  LayeredMountDefinition,
  LayeredMountDefinitionNoArgs,
  LayeredMountDefinitionWithArgs,
  LayeredStreamMountDefinitionNoArgs,
  LayeredStreamMountDefinitionWithArgs,
  MountAction,
  MountDefinition,
  MountDefinitionNoArgs,
  MountDefinitionWithArgs,
  MountRegistration,
  RequirementsOf,
  StreamMountAction,
  StreamMountDefinition,
  StreamMountDefinitionNoArgs,
  StreamMountDefinitionWithArgs,
  ToEffectLayer,
  ToStreamLayer,
} from './index.js'
export {
  MountDefinitionTypeId,
  MountRegistrationTypeId,
  MountTracker,
  ViewState,
  define,
  defineStream,
  liveViewStateChanges,
  mapMessage,
} from './index.js'
