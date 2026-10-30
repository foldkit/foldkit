import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

const Message = defineMessageUnion({
  ToggledArticle: { isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

export class ArticlePreview extends Block<ArticlePreview>()('ArticlePreview', {
  Model: Schema.Struct({
    isArticleOpen: Schema.Boolean,
  }),
  Message,
}) {}

export const ArticlePreviewLive = ArticlePreview.make(
  Effect.fn(function* () {
    return {
      model: { isArticleOpen: false },

      update: {
        ToggledArticle: (model, { isOpen }) => ({
          model: modifyFields(model, { isArticleOpen: () => isOpen }),
        }),
      },

      // Pass peek to animatePanel to keep that much of the panel visible while
      // closed. The preview is inert until the disclosure opens, so keep the
      // toggle outside the panel where it remains interactive.
      view: (model, h) => {
        const articleView = ({
          button,
          panel,
          animatePanel,
        }: Disclosure.DisclosureAttributes<Message>) =>
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
                [
                  h.Class(
                    'absolute inset-x-0 bottom-2.5 flex justify-center px-4',
                  ),
                ],
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
          )

        return Disclosure.view(
          {
            id: 'architecture-article',
            isOpen: model.isArticleOpen,
            onToggle: isOpen => Message.ToggledArticle({ isOpen }),
            toView: articleView,
          },
          h,
        )
      },
    }
  }),
)
