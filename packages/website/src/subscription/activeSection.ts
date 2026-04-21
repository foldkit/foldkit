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
import { Subscription } from 'foldkit/subscription'

import { Model, SubscriptionDeps } from '../main'
import { ChangedActiveSection } from '../message'
import * as Page from '../page'

export const activeSection: Subscription<
  Model,
  typeof ChangedActiveSection,
  SubscriptionDeps['activeSection']
> = {
  modelToDependencies: (model: Model) => {
    const currentPageTableOfContents = M.value(model.route)
      .pipe(
        M.tag('Manifesto', () => Page.Manifesto.tableOfContents),
        M.tag('GettingStarted', () => Page.GettingStarted.tableOfContents),
        M.tag('ComingFromReact', () => Page.ComingFromReact.tableOfContents),
        M.tag('ReactComparison', () => Page.ReactComparison.tableOfContents),
        M.tag('RoutingAndNavigation', () => Page.Routing.tableOfContents),
        M.tag('FieldValidation', () => Page.FieldValidation.tableOfContents),
        M.tag('Testing', () => Page.Testing.tableOfContents),
        M.tag(
          'BestPracticesSideEffects',
          () => Page.BestPractices.SideEffectsAndPurity.tableOfContents,
        ),
        M.tag(
          'BestPracticesMessages',
          () => Page.BestPractices.Messages.tableOfContents,
        ),
        M.tag(
          'BestPracticesKeying',
          () => Page.BestPractices.Keying.tableOfContents,
        ),
        M.tag(
          'BestPracticesImmutability',
          () => Page.BestPractices.Immutability.tableOfContents,
        ),
        M.tag(
          'ProjectOrganization',
          () => Page.ProjectOrganization.tableOfContents,
        ),
        M.tag('ApiModule', ({ moduleSlug }) =>
          M.value(model.apiReference.apiData).pipe(
            M.tag('Ok', ({ data }) =>
              pipe(
                Page.ApiReference.resolveModule(data.parsedApi, moduleSlug),
                Option.match({
                  onNone: () => [],
                  onSome: Page.ApiReference.toModuleTableOfContents,
                }),
              ),
            ),
            M.orElse(() => []),
          ),
        ),
        M.tag('CoreArchitecture', () => Page.Core.Architecture.tableOfContents),
        M.tag(
          'CoreCounterExample',
          () => Page.Core.CounterExample.tableOfContents,
        ),
        M.tag('CoreModel', () => Page.Core.CoreModel.tableOfContents),
        M.tag('CoreMessages', () => Page.Core.Messages.tableOfContents),
        M.tag('CoreUpdate', () => Page.Core.CoreUpdate.tableOfContents),
        M.tag('CoreView', () => Page.Core.CoreView.tableOfContents),
      )
      .pipe(
        M.tag('TestingStory', () => Page.TestingStory.tableOfContents),
        M.tag('TestingScene', () => Page.TestingScene.tableOfContents),
        M.tag('CoreCommands', () => Page.Core.Commands.tableOfContents),
        M.tag(
          'CoreSubscriptions',
          () => Page.Core.Subscriptions.tableOfContents,
        ),
        M.tag('CoreInitAndFlags', () => Page.Core.InitAndFlags.tableOfContents),
        M.tag('CoreTask', () => Page.Core.CoreTask.tableOfContents),
        M.tag('CoreFile', () => Page.Core.CoreFile.tableOfContents),
        M.tag(
          'CoreRunningYourApp',
          () => Page.Core.RunningYourApp.tableOfContents,
        ),
        M.tag('CoreResources', () => Page.Core.Resources.tableOfContents),
        M.tag(
          'CoreManagedResources',
          () => Page.Core.ManagedResources.tableOfContents,
        ),
        M.tag('CoreCrashView', () => Page.Core.CrashView.tableOfContents),
        M.tag('CoreSlowView', () => Page.Core.SlowView.tableOfContents),
        M.tag('CoreFreezeModel', () => Page.Core.FreezeModel.tableOfContents),
        M.tag('CoreDevtools', () => Page.Core.DevTools.tableOfContents),
        M.tag(
          'PatternsSubmodels',
          () => Page.Patterns.Submodels.tableOfContents,
        ),
        M.tag(
          'PatternsOutMessage',
          () => Page.Patterns.OutMessage.tableOfContents,
        ),
        M.tag(
          'CoreViewMemoization',
          () => Page.Core.ViewMemoization.tableOfContents,
        ),
      )
      .pipe(
        M.tag('UiButton', () => Page.UiPages.ButtonPage.tableOfContents),
        M.tag('UiInput', () => Page.UiPages.InputPage.tableOfContents),
        M.tag('UiTextarea', () => Page.UiPages.TextareaPage.tableOfContents),
        M.tag('UiCalendar', () => Page.UiPages.CalendarPage.tableOfContents),
        M.tag(
          'UiDatePicker',
          () => Page.UiPages.DatePickerPage.tableOfContents,
        ),
        M.tag('UiCheckbox', () => Page.UiPages.CheckboxPage.tableOfContents),
        M.tag(
          'UiRadioGroup',
          () => Page.UiPages.RadioGroupPage.tableOfContents,
        ),
        M.tag('UiSlider', () => Page.UiPages.SliderPage.tableOfContents),
        M.tag('UiSwitch', () => Page.UiPages.SwitchPage.tableOfContents),
        M.tag('UiListbox', () => Page.UiPages.ListboxPage.tableOfContents),
        M.tag('UiCombobox', () => Page.UiPages.ComboboxPage.tableOfContents),
        M.tag('UiDialog', () => Page.UiPages.DialogPage.tableOfContents),
        M.tag('UiMenu', () => Page.UiPages.MenuPage.tableOfContents),
        M.tag('UiPopover', () => Page.UiPages.PopoverPage.tableOfContents),
        M.tag(
          'UiDisclosure',
          () => Page.UiPages.DisclosurePage.tableOfContents,
        ),
        M.tag('UiTabs', () => Page.UiPages.TabsPage.tableOfContents),
        M.tag('UiFieldset', () => Page.UiPages.FieldsetPage.tableOfContents),
        M.tag('UiSelect', () => Page.UiPages.SelectPage.tableOfContents),
      )
      .pipe(
        M.tag(
          'UiDragAndDrop',
          () => Page.UiPages.DragAndDropPage.tableOfContents,
        ),
        M.tag('UiFileDrop', () => Page.UiPages.FileDropPage.tableOfContents),
        M.tag('UiToast', () => Page.UiPages.ToastPage.tableOfContents),
        M.tag('UiTooltip', () => Page.UiPages.TooltipPage.tableOfContents),
        M.tag('UiAnimation', () => Page.UiPages.AnimationPage.tableOfContents),
        M.tag('UiOverview', () => Page.UiPages.OverviewPage.tableOfContents),
        M.tag('AiOverview', () => Page.AiOverview.tableOfContents),
        M.tag('AiSkills', () => Page.AiSkills.tableOfContents),
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
  dependenciesToStream: ({ sections }) =>
    Stream.async<typeof ChangedActiveSection.Type>(emit => {
      if (!Array.isNonEmptyReadonlyArray(sections)) {
        return Effect.void
      }

      const visibleSections = MutableRef.make(HashSet.empty<string>())

      const observer = new IntersectionObserver(
        entries => {
          Array.forEach(entries, ({ isIntersecting, target: { id } }) => {
            if (isIntersecting) {
              MutableRef.update(visibleSections, HashSet.add(id))
            } else {
              MutableRef.update(visibleSections, HashSet.remove(id))
            }
          })

          const activeSectionId = Array.findFirst(sections, sectionId =>
            HashSet.has(MutableRef.get(visibleSections), sectionId),
          )

          Option.match(activeSectionId, {
            onNone: Function.constVoid,
            onSome: sectionId => {
              emit.single(ChangedActiveSection({ sectionId }))
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
