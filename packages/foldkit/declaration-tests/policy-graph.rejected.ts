import {
  ApplicationDefinition,
  p0,
  p1,
  p10,
  p2,
  p3,
  p4,
  p5,
  p6,
  p7,
  p8,
  p9,
} from './policy-graph.accepted.js'

// @ts-expect-error A converging reciprocal policy still requires every referenced Binding.
ApplicationDefinition.makeComposition({
  bindings: [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10],
})
