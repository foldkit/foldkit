import { Schema } from 'effect'
import { Port } from 'foldkit'

// Each Port carries a Schema. The host works with the Schema's Encoded
// side, the app with the decoded Type. Record keys name the ports on the
// handle. Name ports subject-first like DOM event names (stepChanged);
// the app wraps each value into its own verb-first Message (ChangedStep).
export const ports = {
  inbound: { stepChanged: Port.inbound(Schema.Number) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

export const Flags = Schema.Struct({ initialCount: Schema.Number })
export type Flags = typeof Flags.Type
