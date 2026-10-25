import {
  explicitAnyExactMessage,
  Message,
  Model,
} from './focused-step.limitations.js'

explicitAnyExactMessage(
  Model.make({ count: 0 }),
  Message.RequestedIncrement({ amount: 1 }),
)
