import { Effect, Schema as S } from 'effect'
import { Port, Runtime } from 'foldkit'

// Each Port carries a Schema. The host works with the Schema's Encoded
// side, the app with the decoded Type. Record keys name the ports on the
// handle. Name ports subject-first like DOM event names (stepChanged);
// the app wraps each value into its own verb-first Message (ChangedStep).
export const ports = {
  inbound: { stepChanged: Port.inbound(S.Number) },
  outbound: { countChanged: Port.outbound(S.Number) },
}

export const makeElement = (container: HTMLElement, flags: Flags) =>
  Runtime.makeElement({
    Model,
    Flags,
    flags: Effect.succeed(flags),
    init,
    update,
    view,
    subscriptions,
    // Registering the record makes the ports available to the app and
    // types the EmbedHandle that Runtime.embed returns.
    ports,
    container,
  })
