import { Schema } from 'effect'

import * as Accordion from './accordion'

// Fixed number of instances
const ModelA = Schema.Struct({
  accordion1: Accordion.AccordionBlock.Model,
  accordion2: Accordion.AccordionBlock.Model,
  accordion3: Accordion.AccordionBlock.Model,
})
type ModelA = typeof ModelA.Type
// Dynamic number of instances
// Each accordion has an id; messages include the id
// to route updates to the correct element
const ModelB = Schema.Struct({
  accordions: Schema.Array(Accordion.AccordionBlock.Model),
})
type ModelB = typeof ModelB.Type
