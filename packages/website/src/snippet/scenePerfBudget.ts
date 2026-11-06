import { Perf, given, hover, scene, selector } from 'foldkit/scene'
import { test } from 'vitest'

const row = (id: string) => selector(`[data-row-id="${id}"]`)

test('hovering the next row rebuilds only the two rows that changed', () => {
  scene(
    { update, view },
    given(largeTraceModel),
    hover(row('span-1')),
    Perf.budget(
      { updates: 1, lazyInvalidations: 2, nodesChanged: 2, vnodesBuilt: 300 },
      hover(row('span-2')),
    ),
  )
})

// Perf.budget exceeded:
//   vnodesBuilt: 2023 > 300
//
// step 1: HoveredRow
//   update 0.01ms | view x1 6.50ms | 2023 of 4065 vnodes built
//   lazy 1 hit / 0 miss | dom +0 -0 ~2 moved 0 writes 2 | reused 2042 nodes in 1 subtrees
