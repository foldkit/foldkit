import { ReadValue } from './command.js'
import { HostComposition } from './composition.js'
import { HostDefinition } from './contracts.js'

const { makeCommandsStep, makeFieldsStep } = HostDefinition

export const update = HostComposition.makeUpdate({
  ClickedReadValue: makeCommandsStep(() => [ReadValue()]),
  CompletedReadValue: makeFieldsStep.fromMessage(({ value }) => ({
    value: () => value,
  })),
})
