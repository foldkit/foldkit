import { Option } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

import { ApplicationComposition, FruitListboxBinding } from './composition.js'
import { Fruit, Message } from './contracts.js'

const fruitToConfig = (fruit: Fruit) => ({ content: ih.span([], [fruit]) })
export const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedRefresh())], ['Refresh catalog']),
      h.block(
        FruitListboxBinding.embedView({
          slotId: model.fruitListbox.id,
          model: model.fruitListbox,
          viewInputs: {
            items: Fruit.literals,
            itemToConfig: fruitToConfig,
            buttonContent: ih.span([], [model.selectedFruit]),
            maybeSelectedValue: Option.some(model.selectedFruit),
          },
        }),
      ),
    ],
  ),
)
