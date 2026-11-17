import { Array } from 'effect'
// @vitest-environment happy-dom
import { expectDomInSync, given, scene, scroll, selector } from 'foldkit/scene'
import { test } from 'vitest'

const scroller = selector('.scroller')

test('the virtualized list stays correct through small and large scrolls', () => {
  scene(
    { update, view },
    given(largeListModel),
    expectDomInSync(
      ...Array.makeBy(15, index =>
        scroll(scroller, { scrollTop: (index + 1) * 100 }),
      ),
      scroll(scroller, { scrollTop: 4000 }),
      scroll(scroller, { scrollTop: 300 }),
    ),
  )
})
