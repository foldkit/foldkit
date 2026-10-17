import { Effect, Schema } from 'effect'
import { Port } from 'foldkit'

import {
  ApplicationComposition,
  Flags,
  init,
  update,
  view,
} from './application'
import { ApplicationLayer } from './services'

// Each Port carries a Schema. The host works with the Schema's Encoded
// side, the app with the decoded Type. Record keys name the ports on the
// handle. Name ports subject-first like DOM event names (stepChanged);
// the app wraps each value into its own verb-first Message (ChangedStep).
export const ports = {
  inbound: { stepChanged: Port.inbound(Schema.Number) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

export const createElement = (
  container: HTMLElement,
  flags: typeof Flags.Type,
) =>
  ApplicationComposition.makeElement({
    init,
    update,
    view,
    Flags,
    flags: Effect.succeed(flags),
    ports,
    container,
  }).provide(ApplicationLayer)
