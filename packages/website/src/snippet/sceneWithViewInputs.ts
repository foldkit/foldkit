import { Effect, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, role, scene } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { it } from '@effect/vitest'

type StepperViewInput = Readonly<{ label: string; isDisabled: boolean }>

class Stepper extends Block<Stepper, void, StepperViewInput>()('Stepper', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message: defineMessageUnion({ ClickedIncrement: {} }),
}) {}

const StepperLive = Stepper.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },
      view: (model, h, { label, isDisabled }) =>
        h.button(
          [
            h.Disabled(isDisabled),
            h.OnClick(Stepper.Message.ClickedIncrement()),
          ],
          [`${label}: ${model.count}`],
        ),
    }
  }),
)

// A test-only parent. Its constructor args become the child's view input,
// so each test chooses the input it renders with.
class StepperScene extends Block<StepperScene, StepperViewInput>()(
  'StepperScene',
  { Model: Schema.Struct({ stepper: Stepper }) },
) {}

const StepperSceneLive = StepperScene.make(
  Effect.fn(function* (_id, viewInput) {
    const stepper = yield* new Stepper('stepper')

    return {
      model: { stepper },
      view: model => model.stepper.view(viewInput),
    }
  }),
).pipe(Layer.provide(StepperLive))

it.effect('renders the label the parent supplies', () =>
  scene(
    StepperSceneLive,
    { label: 'Guests', isDisabled: false },
    expect(role('button', { name: 'Guests: 0' })).toBeEnabled(),
  ),
)

it.effect('disables the button when the parent asks', () =>
  scene(
    StepperSceneLive,
    { label: 'Guests', isDisabled: true },
    expect(role('button', { name: 'Guests: 0' })).toBeDisabled(),
  ),
)
