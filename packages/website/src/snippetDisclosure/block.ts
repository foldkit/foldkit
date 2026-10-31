import { Effect, HashMap, HashSet } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { Model, SnippetSize } from './model'
import { COLLAPSIBLE_HEIGHT_PX, MeasureSnippetHeight } from './mount'
import { type ViewInputs, view } from './view'

export class SnippetDisclosure extends Block<
  SnippetDisclosure,
  void,
  ViewInputs
>()('SnippetDisclosure', {
  Model,
  Message,
  Mount: [MeasureSnippetHeight],
}) {}

export const SnippetDisclosureLive = SnippetDisclosure.make(
  Effect.fn(function* () {
    return {
      model: {
        openDisclosureIds: HashSet.empty(),
        snippetSizes: HashMap.empty(),
      },

      update: {
        ToggledCodeDisclosure: (model, { disclosureId, isOpen }) => ({
          model: modifyFields(model, {
            openDisclosureIds: isOpen
              ? HashSet.add(disclosureId)
              : HashSet.remove(disclosureId),
          }),
        }),
        CompletedMeasureSnippetHeight: (model, { snippetId, snippetSize }) => ({
          model: modifyFields(model, {
            snippetSizes: HashMap.set(snippetId, snippetSize),
          }),
        }),
      },

      mounts: {
        MeasureSnippetHeight: ({ element, snippetId }) =>
          Effect.sync(() =>
            Message.CompletedMeasureSnippetHeight({
              snippetId,
              snippetSize:
                element.scrollHeight > COLLAPSIBLE_HEIGHT_PX
                  ? SnippetSize.Overflows()
                  : SnippetSize.Fits(),
            }),
          ),
      },

      view,
    }
  }),
)
