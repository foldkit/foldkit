import {
  Array,
  Effect,
  Function,
  HashSet,
  Match as M,
  MutableRef,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { Render, Subscription } from 'foldkit'

import { type Model } from '../main'
import { ChangedActiveSection, type Message } from '../message'
import * as Page from '../page'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  activeSection: entry(
    {
      pageId: S.String,
      sections: S.Array(S.String),
    },
    {
      modelToDependencies: model => {
        const currentPageTableOfContents = M.value(model.route).pipe(
          M.tags({
            Manifesto: () => Page.Manifesto.tableOfContents,
            WhyNoJsx: () => Page.WhyNoJsx.tableOfContents,
            WhatAboutSsr: () => Page.WhatAboutSsr.tableOfContents,
            Performance: () => Page.Performance.tableOfContents,
            GettingStarted: () => Page.GettingStarted.tableOfContents,
            Roadmap: () => Page.Roadmap.tableOfContents,
            ComingFromReact: () => Page.ComingFromReact.tableOfContents,
            ReactComparison: () => Page.ReactComparison.tableOfContents,
            ElmComparison: () => Page.ElmComparison.tableOfContents,
            RoutingAndNavigation: () => Page.Routing.tableOfContents,
            FieldValidation: () => Page.FieldValidation.tableOfContents,
            Testing: () => Page.Testing.tableOfContents,
            BestPracticesSideEffects: () =>
              Page.BestPractices.SideEffectsAndPurity.tableOfContents,
            BestPracticesMessages: () =>
              Page.BestPractices.Messages.tableOfContents,
            BestPracticesKeying: () =>
              Page.BestPractices.Keying.tableOfContents,
            BestPracticesImmutability: () =>
              Page.BestPractices.Immutability.tableOfContents,
            ProjectOrganization: () => Page.ProjectOrganization.tableOfContents,
            ApiModule: ({ moduleSlug }) =>
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
            CoreArchitecture: () => Page.Core.Architecture.tableOfContents,
            CoreCounterExample: () => Page.Core.CounterExample.tableOfContents,
            CoreModel: () => Page.Core.CoreModel.tableOfContents,
            CoreMessages: () => Page.Core.Messages.tableOfContents,
            CoreUpdate: () => Page.Core.CoreUpdate.tableOfContents,
            CoreView: () => Page.Core.CoreView.tableOfContents,
            TestingStory: () => Page.TestingStory.tableOfContents,
            TestingScene: () => Page.TestingScene.tableOfContents,
            CoreCommands: () => Page.Core.Commands.tableOfContents,
            CoreMount: () => Page.Core.Mount.tableOfContents,
            CoreCustomElement: () => Page.Core.CustomElement.tableOfContents,
            CoreSubscriptions: () => Page.Core.Subscriptions.tableOfContents,
            CoreInitAndFlags: () => Page.Core.InitAndFlags.tableOfContents,
            CoreDom: () => Page.Core.CoreDom.tableOfContents,
            CoreRender: () => Page.Core.CoreRender.tableOfContents,
            CoreFile: () => Page.Core.CoreFile.tableOfContents,
            CoreCanvas: () => Page.Core.CoreCanvas.tableOfContents,
            CoreRuntime: () => Page.Core.Runtime.tableOfContents,
            CoreResources: () => Page.Core.Resources.tableOfContents,
            CoreManagedResources: () =>
              Page.Core.ManagedResources.tableOfContents,
            CoreCrashView: () => Page.Core.CrashView.tableOfContents,
            CoreSlowView: () => Page.Core.SlowView.tableOfContents,
            CoreFreezeModel: () => Page.Core.FreezeModel.tableOfContents,
            CoreDevTools: () => Page.Core.DevTools.tableOfContents,
            CoreSubmodel: () => Page.Core.Submodel.tableOfContents,
            PatternsInformingSubmodels: () =>
              Page.Patterns.InformingSubmodels.tableOfContents,
            PatternsSubscriptionOrganization: () =>
              Page.Patterns.SubscriptionOrganization.tableOfContents,
            CoreViewMemoization: () =>
              Page.Core.ViewMemoization.tableOfContents,
            CoreEmbedding: () => Page.Core.Embedding.tableOfContents,
            UiButton: () => Page.UiPages.ButtonPage.tableOfContents,
            UiInput: () => Page.UiPages.InputPage.tableOfContents,
            UiTextarea: () => Page.UiPages.TextareaPage.tableOfContents,
            UiCalendar: () => Page.UiPages.CalendarPage.tableOfContents,
            UiDatePicker: () => Page.UiPages.DatePickerPage.tableOfContents,
            UiCheckbox: () => Page.UiPages.CheckboxPage.tableOfContents,
            UiRadioGroup: () => Page.UiPages.RadioGroupPage.tableOfContents,
            UiSlider: () => Page.UiPages.SliderPage.tableOfContents,
            UiSwitch: () => Page.UiPages.SwitchPage.tableOfContents,
            UiListbox: () => Page.UiPages.ListboxPage.tableOfContents,
            UiCombobox: () => Page.UiPages.ComboboxPage.tableOfContents,
            UiDialog: () => Page.UiPages.DialogPage.tableOfContents,
            UiMenu: () => Page.UiPages.MenuPage.tableOfContents,
            UiPopover: () => Page.UiPages.PopoverPage.tableOfContents,
            UiDisclosure: () => Page.UiPages.DisclosurePage.tableOfContents,
            UiTabs: () => Page.UiPages.TabsPage.tableOfContents,
            UiFieldset: () => Page.UiPages.FieldsetPage.tableOfContents,
            UiSelect: () => Page.UiPages.SelectPage.tableOfContents,
            UiDragAndDrop: () => Page.UiPages.DragAndDropPage.tableOfContents,
            UiFileDrop: () => Page.UiPages.FileDropPage.tableOfContents,
            UiToast: () => Page.UiPages.ToastPage.tableOfContents,
            UiTooltip: () => Page.UiPages.TooltipPage.tableOfContents,
            UiAnimation: () => Page.UiPages.AnimationPage.tableOfContents,
            UiVirtualList: () => Page.UiPages.VirtualListPage.tableOfContents,
            UiOverview: () => Page.UiPages.OverviewPage.tableOfContents,
            UiSelectionSubmodels: () =>
              Page.UiPages.SelectionSubmodelsPage.tableOfContents,
            AiOverview: () => Page.AiOverview.tableOfContents,
            AiSkills: () => Page.AiSkills.tableOfContents,
            AiMcp: () => Page.AiMcp.tableOfContents,
            TypingTerminal: () => Page.TypingTerminal.tableOfContents,
          }),
          M.tag(
            'Home',
            'Newsletter',
            'Playground',
            'NotFound',
            'Examples',
            'ExampleDetail',
            () => [],
          ),
          M.exhaustive,
        )

        return {
          pageId: model.route._tag,
          sections: Array.map(currentPageTableOfContents, ({ id }) => id),
        }
      },
      dependenciesToStream: ({ sections }) =>
        Stream.callback<typeof ChangedActiveSection.Type>(queue =>
          Effect.gen(function* () {
            if (!Array.isReadonlyArrayNonEmpty(sections)) {
              return yield* Effect.never
            }

            yield* Render.afterCommit

            yield* Effect.acquireRelease(
              Effect.sync(() => {
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
                        Queue.offerUnsafe(
                          queue,
                          ChangedActiveSection({ sectionId }),
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

                return observer
              }),
              observer => Effect.sync(() => observer.disconnect()),
            )

            return yield* Effect.never
          }),
        ),
    },
  ),
}))
