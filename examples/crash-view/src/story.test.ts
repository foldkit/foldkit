import { withBlock } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, layer } from './application'

describe('update', () => {
  it.effect('handling any Message throws to trigger the crash view', () =>
    withBlock({ block: ApplicationBlock, layer }, block => {
      expect(() => block.update(null, Message.ClickedCrash())).toThrow(
        'This is a simulated crash!',
      )
    }),
  )
})
