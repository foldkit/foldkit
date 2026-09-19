import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { type HtmlBuilder, __htmlBuilder } from './index.js'

/* eslint-disable @typescript-eslint/consistent-type-assertions */
const pointerDownHandlerOf = (
  vnode: ReturnType<HtmlBuilder<never>['div']>,
): ((event: unknown) => void) =>
  vnode?.data?.on?.['pointerdown'] as unknown as (event: unknown) => void
/* eslint-enable @typescript-eslint/consistent-type-assertions */

describe('OnPointerDown', () => {
  it('passes the originating target to the callback', () => {
    const target = document.createElement('button')
    let receivedTarget: EventTarget | null = null
    const h = __htmlBuilder<never>()
    const vnode = h.div([
      h.OnPointerDown(
        (
          _pointerType,
          _button,
          _screenX,
          _screenY,
          _timeStamp,
          _clientX,
          _clientY,
          _pointerId,
          eventTarget,
        ) => {
          receivedTarget = eventTarget
          return Option.none()
        },
      ),
    ])

    pointerDownHandlerOf(vnode)({ target })

    expect(receivedTarget).toBe(target)
  })
})
