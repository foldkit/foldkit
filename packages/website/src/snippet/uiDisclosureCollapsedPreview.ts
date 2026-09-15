// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

// Store the open state as a plain boolean field in your Model:
const Model = Schema.Struct({
  isArticleOpen: Schema.Boolean,
  // ...your other fields
})

// In your init function, start it closed:
const init = () => ({
  model: {
    isArticleOpen: false,
    // ...your other fields
  },
})

// A verb-first, past-tense Message carries the new open state:
const Message = defineMessageUnion({
  ToggledArticle: { isOpen: Schema.Boolean },
})

// In the corresponding Message.match handler, store the value:
ToggledArticle: ({ isOpen }) => ({
  model: evo(model, { isArticleOpen: () => isOpen }),
})

// Pass peek to animatePanel to keep that much of the panel visible while
// closed. The preview is inert until the disclosure opens, so keep the toggle
// outside the panel where it remains interactive. The toggle overlays the
// collapsed preview; extra panel padding keeps it clear of the full article.
const view = (model, h: HtmlBuilder<Message>) =>
  Disclosure.view(
    {
      id: 'architecture-article',
      isOpen: model.isArticleOpen,
      onToggle: isOpen => Message.ToggledArticle({ isOpen }),
      toView: ({ button, panel, animatePanel }) =>
        h.article(
          [h.Class('relative overflow-hidden rounded-lg border bg-white')],
          [
            h.h2(
              [h.Class('px-4 py-3 font-normal')],
              ['Why the Elm Architecture scales'],
            ),
            h.div(
              [h.Class('relative')],
              [
                animatePanel(
                  h.div(
                    [
                      ...panel,
                      h.Class(
                        `space-y-3 border-t px-4 pt-3 leading-6 ${model.isArticleOpen ? 'pb-20' : 'pb-3'}`,
                      ),
                    ],
                    [
                      h.p([], ['The first paragraph of the article…']),
                      h.p([], ['More detail that appears after expansion…']),
                      h.p([], ['The conclusion of the article…']),
                    ],
                  ),
                  { peek: '6rem' },
                ),
                ...(model.isArticleOpen
                  ? []
                  : [
                      // Match the fade's solid color to the card background.
                      h.div([
                        h.AriaHidden(true),
                        h.Class(
                          'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent',
                        ),
                      ]),
                    ]),
              ],
            ),
            h.div(
              [h.Class('absolute inset-x-0 bottom-4 flex justify-center px-4')],
              [
                h.button(
                  [
                    ...button,
                    h.Class('rounded-full border bg-white px-5 py-2'),
                  ],
                  [model.isArticleOpen ? 'Show less' : 'Read more'],
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )
