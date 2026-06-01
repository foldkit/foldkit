import { ManagedResource } from 'foldkit'

import * as VideoCall from './videoCall'

// The VideoCall Submodel owns its managed resources in its own Model and
// Message terms (built with ManagedResource.make), knowing nothing about any
// parent. lift translates that record into the parent's context through a
// single Model lens and a single Message wrapper, exactly like update
// delegation and Subscription.lift.
//
// toChildModel returns an Option. A managed resource already speaks in Option
// (modelToMaybeRequirements returns Option.none() to release), and a Submodel
// embedded as Option that isn't mounted is just another none: a missing child
// releases the resource through the same channel.
const videoCallManagedResources = ManagedResource.lift(
  VideoCall.managedResources,
)<Model, Message>({
  toChildModel: model => model.videoCall,
  toParentMessage: message => GotVideoCallMessage({ message }),
})

// aggregate combines a root-level record with one or more lifted child
// records into the single record makeProgram expects. It throws at startup on
// duplicate keys, so a collision fails loudly instead of silently overriding.
export const managedResources = ManagedResource.aggregate<Model, Message>()(
  rootManagedResources,
  videoCallManagedResources,
)
