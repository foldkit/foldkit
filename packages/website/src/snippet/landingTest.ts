import { Scene, Story } from 'foldkit'
import { expect, test } from 'vitest'

// Story — test the state machine
test('open the pod bay door', () => {
  Story.story(
    update,
    Story.with(model),
    Story.message(PressedOpenPodBayDoor({ airlock: 'C' })),
    Story.model(model => {
      expect(model.airlockC._tag).toBe('RunningDiagnostics')
    }),
    Story.resolve(RunDiagnostics, SucceededDiagnostics()),
    Story.resolve(Depressurize, CompletedDepressurize()),
    Story.resolve(OpenDoor, CompletedOpenDoor()),
    Story.model(model => {
      expect(model.airlockC._tag).toBe('Open')
    }),
  )
})

// Scene — test through the view
test('type a zip code, see the forecast', () => {
  Scene.scene(
    { update, view },
    Scene.with(model),
    Scene.type(Scene.label('Zip code'), '90210'),
    Scene.submit(Scene.role('form')),
    Scene.expect(Scene.role('button', { name: 'Loading...' })).toExist(),
    Scene.resolve(FetchWeather, SucceededFetchWeather({ weather })),
    Scene.expect(Scene.role('heading', { name: '90210' })).toExist(),
    Scene.expect(Scene.role('article')).toContainText('72\u00B0F'),
  )
})
