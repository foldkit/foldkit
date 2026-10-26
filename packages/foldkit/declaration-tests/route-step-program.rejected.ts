import { Runtime } from 'foldkit'
import { Transition } from 'foldkit/route'

import {
  type ConnectedPolicyStep,
  type PolicyStep,
  connectedProgram,
  loadDetailStep,
  persistDraftStep,
  policyTransition,
  preserveModelStep,
  preserveParentStep,
  refreshChildStep,
} from './route-step-program.accepted.js'

Transition.match<PolicyStep>()(policyTransition, 'NoteDetail', {
  Entered: () => loadDetailStep,
  Exited: () => persistDraftStep,
  Stayed: () => preserveModelStep,
  // @ts-expect-error Every handler must return the constrained Step.
  Unrelated: () => 'unrelated',
})

Transition.match<ConnectedPolicyStep>()(policyTransition, 'NoteDetail', {
  Entered: () => refreshChildStep,
  Exited: () => preserveParentStep,
  Stayed: () => refreshChildStep,
  // @ts-expect-error Connected matcher output cannot discard its Step contract.
  Unrelated: () => 'unrelated',
})

// @ts-expect-error The child Command handler still requires Store.
Runtime.run(connectedProgram)
