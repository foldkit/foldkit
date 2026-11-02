import { Stream } from 'effect'
import { Port } from 'foldkit'

import { ports } from './embeddingPorts'
import { Message } from './embeddingWidgetMessage'

// An inbound Port is a Stream source. Each decoded value the host sends
// becomes a Message, so host input enters update like any other event.
export const hostStepChanges = Port.stream(ports.inbound.stepChanged).pipe(
  Stream.map(step => Message.ChangedStep({ step })),
)
