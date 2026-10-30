import {
  Message,
  Model,
  explicitAnyExactMessage,
} from './focused-step.limitations.js'

explicitAnyExactMessage(
  Model.make({ count: 0 }),
  Message.RequestedIncrement({ amount: 1 }),
)
