import {
  Array,
  Effect,
  Function,
  HashSet,
  Match as M,
  MutableRef,
  Option,
  Stream,
  pipe,
} from 'effect'
import { Command } from 'foldkit/command'
import { Subscription } from 'foldkit/subscription'

import {
  ChangedActiveSection,
  Model,
  SubscriptionDeps,
} from '../main'
import * as Page from '../page'

export const activeSection: Subscription<
  Model,
  typeof ChangedActiveSection,
  SubscriptionDeps['activeSection']
> = {
  modelToDependencies: (model: Model) => {
    const currentPageTableOfContents = M.value(model.route)
      .pipe(
        M.tag('WhyFoldkit', () => Page.WhyFoldkit.tableOfContents),
        M.tag(
          'GettingStarted',
          () => Page.GettingStarted.tableOfContents,
        ),
        M.tag(
          'ComingFromReact',
          () => Page.ComingFromReact.tableOfContents,
        ),
        M.tag(
          'RoutingAndNavigation',
          () => Page.Routing.tableOfContents,
        ),
        M.tag(
          'FieldValidation',
          () => Page.FieldValidation.tableOfContents,
        ),
        M.tag(
          'BestPractices',
          () => Page.BestPractices.tableOfContents,
        ),
        M.tag(
          'ProjectOrganization',
          () => Page.ProjectOrganization.tableOfContents,
        ),
        M.tag('ApiModule', ({ moduleSlug }) =>
          pipe(
            moduleSlug,
            Page.ApiReference.slugToModule,
            Option.match({
              onNone: () => [],
              onSome: Page.ApiReference.toModuleTableOfContents,
            }),
          ),
        ),
        M.tag(
          'CoreCounterExample',
          () => Page.Core.CounterExample.tableOfContents,
        ),
        M.tag('CoreModel', () => Page.Core.CoreModel.tableOfContents),
        M.tag(
          'CoreMessages',
          () => Page.Core.Messages.tableOfContents,
        ),
        M.tag(
          'CoreUpdate',
          () => Page.Core.CoreUpdate.tableOfContents,
        ),
        M.tag('CoreView', () => Page.Core.CoreView.tableOfContents),
        M.tag(
          'CoreCommands',
          () => Page.Core.Commands.tableOfContents,
        ),
        M.tag(
          'CoreSubscriptions',
          () => Page.Core.Subscriptions.tableOfContents,
        ),
        M.tag('CoreInit', () => Page.Core.Init.tableOfContents),
        M.tag('CoreTask', () => Page.Core.CoreTask.tableOfContents),
        M.tag(
          'CoreRunningYourApp',
          () => Page.Core.RunningYourApp.tableOfContents,
        ),
      )
      .pipe(
        M.tag(
          'CoreResources',
          () => Page.Core.Resources.tableOfContents,
        ),
        M.tag(
          'CoreManagedResources',
          () => Page.Core.ManagedResources.tableOfContents,
        ),
        M.tag(
          'CoreErrorView',
          () => Page.Core.ErrorView.tableOfContents,
        ),
        M.tag(
          'CoreSlowViewWarning',
          () => Page.Core.SlowViewWarning.tableOfContents,
        ),
        M.tag(
          'PatternsSubmodels',
          () => Page.Patterns.Submodels.tableOfContents,
        ),
        M.tag(
          'PatternsModelAsUnion',
          () => Page.Patterns.ModelAsUnion.tableOfContents,
        ),
        M.tag(
          'PatternsOutMessage',
          () => Page.Patterns.OutMessage.tableOfContents,
        ),
        M.tag(
          'CoreViewMemoization',
          () => Page.Core.ViewMemoization.tableOfContents,
        ),
        M.tag('UiTabs', () => Page.UiPages.TabsPage.tableOfContents),
        M.tag(
          'UiDisclosure',
          () => Page.UiPages.DisclosurePage.tableOfContents,
        ),
        M.tag(
          'UiDialog',
          () => Page.UiPages.DialogPage.tableOfContents,
        ),
        M.tag('UiMenu', () => Page.UiPages.MenuPage.tableOfContents),
        M.tag(
          'UiPopover',
          () => Page.UiPages.PopoverPage.tableOfContents,
        ),
        M.tag(
          'UiListbox',
          () => Page.UiPages.ListboxPage.tableOfContents,
        ),
        M.tag(
          'UiRadioGroup',
          () => Page.UiPages.RadioGroupPage.tableOfContents,
        ),
        M.tag(
          'UiSwitch',
          () => Page.UiPages.SwitchPage.tableOfContents,
        ),
        M.tag(
          'UiCombobox',
          () => Page.UiPages.ComboboxPage.tableOfContents,
        ),
        M.option,
      )

    return {
      pageId: model.route._tag,
      sections: Option.match(currentPageTableOfContents, {
        onNone: () => [],
        onSome: Array.map(({ id }) => id),
      }),
    }
  },
  depsToStream: ({ sections }) =>
    Stream.async<Command<typeof ChangedActiveSection>>(emit => {
      if (!Array.isNonEmptyReadonlyArray(sections)) {
        return Effect.void
      }

      const visibleSections = MutableRef.make(HashSet.empty<string>())

      const observer = new IntersectionObserver(
        entries => {
          Array.forEach(
            entries,
            ({ isIntersecting, target: { id } }) => {
              if (isIntersecting) {
                MutableRef.update(visibleSections, HashSet.add(id))
              } else {
                MutableRef.update(visibleSections, HashSet.remove(id))
              }
            },
          )

          const activeSectionId = Array.findFirst(
            sections,
            sectionId =>
              HashSet.has(MutableRef.get(visibleSections), sectionId),
          )

          Option.match(activeSectionId, {
            onNone: Function.constVoid,
            onSome: sectionId => {
              emit.single(
                Effect.succeed(ChangedActiveSection({ sectionId })),
              )
            },
          })
        },
        {
          rootMargin: '-100px 0px -80% 0px',
        },
      )

      Array.forEach(sections, sectionId => {
        const element = document.getElementById(sectionId)

        if (element) {
          observer.observe(element)
        }
      })

      return Effect.sync(() => observer.disconnect())
    }),
}
