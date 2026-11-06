import { Array, Duration, Match, Number, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { DelayAdvanceAsyncCounterPhase } from './command'
import { AsyncCounterDemoComposition } from './composition'
import { clampResetSeconds } from './resetDuration'

const PHASE_DURATION: Duration.Input = '300 millis'
const MAX_LOG_ENTRIES = 50
const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    pipe([entry, ...messageLog], Array.take(MAX_LOG_ENTRIES))

export const update = AsyncCounterDemoComposition.makeUpdate({
  ClickedDemoIncrement: model => {
    const nextModel = modifyFields(model, {
      count: Number.increment,
      phase: () => 'IncrementMessage',
      generation: Number.increment,
      messageLog: prependToLog('ClickedIncrement'),
    })
    return {
      model: nextModel,
      commands: [
        DelayAdvanceAsyncCounterPhase({
          generation: nextModel.generation,
          duration: Duration.fromInputUnsafe(PHASE_DURATION),
        }),
      ],
    }
  },

  ChangedDemoResetDuration: (model, { seconds }) => {
    const nextModel = modifyFields(model, {
      resetDuration: () => clampResetSeconds(seconds),
      phase: () => 'DurationMessage',
      generation: Number.increment,
      messageLog: prependToLog(`ChangedResetDuration({ seconds: ${seconds} })`),
    })
    return {
      model: nextModel,
      commands: [
        DelayAdvanceAsyncCounterPhase({
          generation: nextModel.generation,
          duration: Duration.fromInputUnsafe(PHASE_DURATION),
        }),
      ],
    }
  },

  ClickedDemoReset: model => {
    const nextModel = modifyFields(model, {
      isResetting: () => true,
      phase: () => 'ResetMessage',
      generation: Number.increment,
      messageLog: prependToLog('ClickedResetAfterDelay'),
    })
    return {
      model: nextModel,
      commands: [
        DelayAdvanceAsyncCounterPhase({
          generation: nextModel.generation,
          duration: Duration.fromInputUnsafe(PHASE_DURATION),
        }),
      ],
    }
  },

  CompletedDelayAdvanceAsyncCounterPhase: (model, { generation }) => {
    if (generation !== model.generation) {
      return { model }
    } else {
      return Match.value(model.phase).pipe(
        Match.when('IncrementMessage', () => ({
          model: modifyFields(model, { phase: () => 'IncrementUpdate' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('IncrementUpdate', () => ({
          model: modifyFields(model, { phase: () => 'IncrementModel' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('IncrementModel', () => ({
          model: modifyFields(model, { phase: () => 'Idle' }),
        })),
        Match.when('DurationMessage', () => ({
          model: modifyFields(model, { phase: () => 'DurationUpdate' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('DurationUpdate', () => ({
          model: modifyFields(model, { phase: () => 'DurationModel' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('DurationModel', () => ({
          model: modifyFields(model, { phase: () => 'Idle' }),
        })),
        Match.when('ResetMessage', () => ({
          model: modifyFields(model, { phase: () => 'ResetUpdate' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('ResetUpdate', () => ({
          model: modifyFields(model, { phase: () => 'ResetCommand' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(
                `${clampResetSeconds(model.resetDuration)} seconds`,
              ),
            }),
          ],
        })),
        Match.when('ResetCommand', () => ({
          model: modifyFields(model, { phase: () => 'ResetCommandMessage' }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('ResetCommandMessage', () => ({
          model: modifyFields(model, {
            phase: () => 'ResetCommandUpdate',
            messageLog: prependToLog('CompletedDelayReset'),
          }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('ResetCommandUpdate', () => ({
          model: modifyFields(model, {
            count: () => 0,
            isResetting: () => false,
            phase: () => 'ResetModel',
          }),
          commands: [
            DelayAdvanceAsyncCounterPhase({
              generation,
              duration: Duration.fromInputUnsafe(PHASE_DURATION),
            }),
          ],
        })),
        Match.when('ResetModel', () => ({
          model: modifyFields(model, { phase: () => 'Idle' }),
        })),
        Match.when('Idle', () => ({ model })),
        Match.exhaustive,
      )
    }
  },
})
