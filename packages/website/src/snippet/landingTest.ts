import { Test } from 'foldkit'
import { expect, test } from 'vitest'

test('open the pod bay door', () => {
  Test.story(
    update,
    Test.with(model),

    Test.message(PressedOpenPodBayDoor({ airlock: 'C' })),
    Test.tap(({ model, commands }) => {
      expect(model.airlockC._tag).toBe('RunningDiagnostics')
      expect(commands[0]?.name).toBe(RunDiagnostics.name)
    }),

    Test.resolve(RunDiagnostics, SucceededDiagnostics()),
    Test.tap(({ model, message, commands }) => {
      expect(message?._tag).toBe('SucceededDiagnostics')
      expect(model.airlockC._tag).toBe('Depressurizing')
      expect(commands[0]?.name).toBe(Depressurize.name)
    }),

    Test.resolve(Depressurize, CompletedDepressurize()),
    Test.tap(({ model, message, commands }) => {
      expect(message?._tag).toBe('CompletedDepressurize')
      expect(model.airlockC._tag).toBe('Opening')
      expect(commands[0]?.name).toBe(OpenDoor.name)
    }),

    Test.resolve(OpenDoor, CompletedOpenDoor()),
    Test.tap(({ model, message }) => {
      expect(message?._tag).toBe('CompletedOpenDoor')
      expect(model.airlockC._tag).toBe('Open')
    }),
  )
})
