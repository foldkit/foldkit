import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, p } from './html'

// Submodel wiring:
//   Model field: transition: Ui.Transition.Model
//   Init: Ui.Transition.init({ id: 'content' })
//   Update: delegate via Ui.Transition.update — returns [model, commands, maybeOutMessage]

const GotTransitionMessage = m('GotTransitionMessage', {
  message: Ui.Transition.Message,
})

// Trigger show/hide by dispatching Showed() or Hidden():
//   Ui.Transition.Showed()  → starts enter animation
//   Ui.Transition.Hidden()  → starts leave animation

// Handle OutMessage in your update:
//   StartedLeaveAnimating → provide Transition.defaultLeaveCommand(model)
//   TransitionedOut → unmount or hide content

// The view — CSS transitions driven by data attributes:
Ui.Transition.view({
  model: model.transition,
  animateSize: true,
  className:
    'transition duration-200 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
  content: p([], ['This content animates in and out.']),
})
