import { Effect, Schema } from 'effect'
import { Block, Mount, Scene } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { it } from '@effect/vitest'

const Message = defineMessageUnion({
  ClickedOpenSearch: {},
  ClickedCloseSearch: {},
  CompletedFocusSearchInput: {},
})

const FocusSearchInput = Mount.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

class SearchPanel extends Block<SearchPanel>()('SearchPanel', {
  Model: Schema.Struct({ isOpen: Schema.Boolean }),
  Message,
  Mount: [FocusSearchInput],
}) {}

const SearchPanelLive = SearchPanel.make(
  Effect.fn(function* () {
    return {
      model: { isOpen: false },

      update: {
        ClickedOpenSearch: model => ({
          model: modifyFields(model, { isOpen: () => true }),
        }),
        ClickedCloseSearch: model => ({
          model: modifyFields(model, { isOpen: () => false }),
        }),
        CompletedFocusSearchInput: model => ({ model }),
      },

      mounts: {
        FocusSearchInput: ({ element }) =>
          Effect.sync(() => {
            if (element instanceof HTMLElement) {
              element.focus()
            }
          }).pipe(Effect.as(Message.CompletedFocusSearchInput())),
      },

      view: (model, h) =>
        model.isOpen
          ? h.div(
              [],
              [
                h.input([h.AriaLabel('Search'), h.OnMount(FocusSearchInput())]),
                h.button([h.OnClick(Message.ClickedCloseSearch())], ['Close']),
              ],
            )
          : h.button([h.OnClick(Message.ClickedOpenSearch())], ['Search']),
    }
  }),
)

it.effect('focuses the search input when the panel opens', () =>
  Scene.scene(
    SearchPanelLive,
    Scene.click(Scene.role('button', { name: 'Search' })),

    // The input's Mount is pending until the test supplies its result.
    Scene.Mount.expectExact(FocusSearchInput),
    Scene.Mount.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
    Scene.Mount.expectNone(),

    // Removing the input ends its Mount. Acknowledge every ended Mount.
    Scene.click(Scene.role('button', { name: 'Close' })),
    Scene.Mount.expectEnded(FocusSearchInput),
  ),
)
