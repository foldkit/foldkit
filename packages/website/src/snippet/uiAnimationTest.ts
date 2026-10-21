import { Scene, Story } from 'foldkit'

import { Animation } from '@foldkit/ui'

import { FocusButton, Message, init, update, view } from './main'

Story.story(
  update,
  Story.given(init().model),
  Story.message(Message.ClickedToggle()),
  Animation.test.paint,
  Animation.test.settled,
)

Scene.scene(
  { update, view },
  Scene.given(init().model),
  Scene.click(Scene.role('button', { name: 'Toggle' })),
  Animation.test.resolveAll(
    [FocusButton, Message.CompletedFocusButton()],
    Animation.test.paint,
    Animation.test.settled,
  ),
)
