import { Runtime } from 'foldkit'
import { Transition } from 'foldkit/route'

import {
  type ConnectedPolicyStep,
  type PolicyStep,
  connectedProgram,
  loadDetail,
  persistDraft,
  policyTransition,
  preserveModel,
  preserveParent,
  refreshChild,
} from './route-step-program.accepted.js'

Transition.match<PolicyStep>()(policyTransition, 'NoteDetail', {
  Entered: () => loadDetail,
  Exited: () => persistDraft,
  Stayed: () => preserveModel,
  // @ts-expect-error Every handler must return the constrained Step.
  Unrelated: () => 'unrelated',
})

Transition.match<ConnectedPolicyStep>()(policyTransition, 'NoteDetail', {
  Entered: () => refreshChild,
  Exited: () => preserveParent,
  Stayed: () => refreshChild,
  // @ts-expect-error Connected matcher output cannot discard its Step contract.
  Unrelated: () => 'unrelated',
})

// @ts-expect-error The child Command handler still requires Store.
Runtime.run(connectedProgram)
