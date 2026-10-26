import {
  Message,
  Model,
  explicitAnyExactMessageStep,
} from './focused-step.limitations.js'

explicitAnyExactMessageStep(
  Model.make({ count: 0 }),
  Message.RequestedIncrement({ amount: 1 }),
)
