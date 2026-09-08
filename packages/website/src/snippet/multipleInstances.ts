import { Schema } from 'effect'

import * as Accordion from './accordion'

// Fixed number of instances
const ModelA = Schema.Struct({
  accordion1: Accordion.Model,
  accordion2: Accordion.Model,
  accordion3: Accordion.Model,
})

// Dynamic number of instances
// Each accordion has an id; messages include the id
// to route updates to the correct element
const ModelB = Schema.Struct({
  accordions: Schema.Array(Accordion.Model),
})
