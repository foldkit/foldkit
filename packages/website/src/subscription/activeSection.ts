import {
  Array,
  Effect,
  HashSet,
  Match,
  MutableRef,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Render } from 'foldkit'

import { ApplicationDefinition } from '../definition'
import { Message } from '../message'
import {
  About,
  AiMcp,
  AiOverview,
  AiSkills,
  AsyncData as AsyncDataPage,
  BestPractices,
  ComingFromTanStackQuery,
  Contact,
  ContentApi,
  Core,
  EffectAtomComparison,
  ElmComparison,
  FieldValidation,
  GetStarted,
  Patterns,
  Performance,
  PreviewMigration,
  PreviewUpgrade,
  Privacy,
  ProjectOrganization,
  ReactComparison,
  Roadmap,
  Routing,
  Testing,
  TestingScene,
  TestingStory,
  ToolingLinting,
  TypingTerminal,
  WhyFoldkit,
} from '../page'
import * as ApiReference from '../page/apiReference/domain'
import * as ComingFromReact from '../page/comingFromReact/domain'
import * as CoreBlockMetadata from '../page/core/blockPage/domain'
import * as UiDocumentation from '../page/ui/domain'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  activeSectionChanges: entry(
    'ActiveSectionChanges',
    {
      pageId: Schema.String,
      sections: Schema.Array(Schema.String),
    },
    {
      messages: [Message.ChangedActiveSection],
      modelToDependencies: model => {
        const currentPageTableOfContents = Match.value(model.route).pipe(
          Match.tags({
            WhyFoldkit: () => WhyFoldkit.tableOfContents,
            Performance: () => Performance.tableOfContents,
            GetStarted: () => GetStarted.tableOfContents,
            Roadmap: () => Roadmap.tableOfContents,
            ComingFromReact: () => ComingFromReact.tableOfContents,
            ComingFromTanStackQuery: () =>
              ComingFromTanStackQuery.tableOfContents,
            ReactComparison: () => ReactComparison.tableOfContents,
            EffectAtomComparison: () => EffectAtomComparison.tableOfContents,
            ElmComparison: () => ElmComparison.tableOfContents,
            RoutingAndNavigation: () => Routing.tableOfContents,
            FieldValidation: () => FieldValidation.tableOfContents,
            Testing: () => Testing.tableOfContents,
            BestPracticesSideEffects: () =>
              BestPractices.SideEffectsAndPurity.tableOfContents,
            BestPracticesMessages: () => BestPractices.Messages.tableOfContents,
            BestPracticesKeying: () => BestPractices.Keying.tableOfContents,
            BestPracticesImmutability: () =>
              BestPractices.Immutability.tableOfContents,
            PreviewMigration: () => PreviewMigration.tableOfContents,
            PreviewUpgrade: () => PreviewUpgrade.tableOfContents,
            ProjectOrganization: () => ProjectOrganization.tableOfContents,
            ToolingLinting: () => ToolingLinting.tableOfContents,
            ApiModule: ({ moduleSlug }) =>
              Option.match(AsyncData.getData(model.apiReference.apiData), {
                onSome: data =>
                  pipe(
                    ApiReference.resolveModule(data.parsedApi, moduleSlug),
                    Option.match({
                      onNone: () => [],
                      onSome: ApiReference.toModuleTableOfContents,
                    }),
                  ),
                onNone: () => [],
              }),
            CoreArchitecture: () => Core.Architecture.tableOfContents,
            CoreCounterExample: () => Core.CounterExample.tableOfContents,
            CoreModel: () => Core.CoreModel.tableOfContents,
            CoreMessages: () => Core.Messages.tableOfContents,
            CoreUpdate: () => Core.CoreUpdate.tableOfContents,
            CoreView: () => Core.CoreView.tableOfContents,
            TestingStory: () => TestingStory.tableOfContents,
            TestingScene: () => TestingScene.tableOfContents,
            CoreCommands: () => Core.Commands.tableOfContents,
            CoreMount: () => Core.Mount.tableOfContents,
            CoreCustomElement: () => Core.CustomElement.tableOfContents,
            CoreSubscriptions: () => Core.Subscriptions.tableOfContents,
            CoreInitAndFlags: () => Core.InitAndFlags.tableOfContents,
            CoreDom: () => Core.CoreDom.tableOfContents,
            CoreRender: () => Core.CoreRender.tableOfContents,
            CoreFile: () => Core.CoreFile.tableOfContents,
            CoreHttp: () => Core.CoreHttp.tableOfContents,
            CoreQuery: () => Core.CoreQuery.tableOfContents,
            CoreLiveQuery: () => Core.CoreLiveQuery.tableOfContents,
            CoreCanvas: () => Core.CoreCanvas.tableOfContents,
            CoreRuntime: () => Core.Runtime.tableOfContents,
            CoreServerRendering: () => Core.CoreServerRendering.tableOfContents,
            CoreLayers: () => Core.Layers.tableOfContents,
            CoreManagedResources: () => Core.ManagedResources.tableOfContents,
            CoreCrashView: () => Core.CrashView.tableOfContents,
            CoreViewTransitions: () => Core.ViewTransitions.tableOfContents,
            CoreSlowWarnings: () => Core.Slow.tableOfContents,
            CoreFreezeModel: () => Core.FreezeModel.tableOfContents,
            CorePreserveScroll: () => Core.PreserveScroll.tableOfContents,
            CoreDevTools: () => Core.DevTools.tableOfContents,
            CoreBlock: () => CoreBlockMetadata.tableOfContents,
            CoreMachine: () => Core.Machine.tableOfContents,
            AsyncData: () => AsyncDataPage.tableOfContents,
            PatternsAntiPatterns: () => Patterns.AntiPatterns.tableOfContents,
            PatternsInformingBlocks: () =>
              Patterns.InformingBlocks.tableOfContents,
            PatternsSubscriptionOrganization: () =>
              Patterns.SubscriptionOrganization.tableOfContents,
            CoreViewMemoization: () => Core.ViewMemoization.tableOfContents,
            CoreEmbedding: () => Core.Embedding.tableOfContents,
            UiButton: () => UiDocumentation.tableOfContentsFor('Button'),
            UiInput: () => UiDocumentation.tableOfContentsFor('Input'),
            UiTextarea: () => UiDocumentation.tableOfContentsFor('Textarea'),
            UiCalendar: () => UiDocumentation.tableOfContentsFor('Calendar'),
            UiDatePicker: () =>
              UiDocumentation.tableOfContentsFor('DatePicker'),
            UiCheckbox: () => UiDocumentation.tableOfContentsFor('Checkbox'),
            UiRadioGroup: () =>
              UiDocumentation.tableOfContentsFor('RadioGroup'),
            UiSlider: () => UiDocumentation.tableOfContentsFor('Slider'),
            UiMeter: () => UiDocumentation.tableOfContentsFor('Meter'),
            UiProgress: () => UiDocumentation.tableOfContentsFor('Progress'),
            UiSwitch: () => UiDocumentation.tableOfContentsFor('Switch'),
            UiListbox: () => UiDocumentation.tableOfContentsFor('Listbox'),
            UiCombobox: () => UiDocumentation.tableOfContentsFor('Combobox'),
            UiDialog: () => UiDocumentation.tableOfContentsFor('Dialog'),
            UiMenu: () => UiDocumentation.tableOfContentsFor('Menu'),
            UiPopover: () => UiDocumentation.tableOfContentsFor('Popover'),
            UiDisclosure: () =>
              UiDocumentation.tableOfContentsFor('Disclosure'),
            UiTabs: () => UiDocumentation.tableOfContentsFor('Tabs'),
            UiNav: () => UiDocumentation.tableOfContentsFor('Nav'),
            UiFieldset: () => UiDocumentation.tableOfContentsFor('Fieldset'),
            UiSelect: () => UiDocumentation.tableOfContentsFor('Select'),
            UiDragAndDrop: () =>
              UiDocumentation.tableOfContentsFor('DragAndDrop'),
            UiFileDrop: () => UiDocumentation.tableOfContentsFor('FileDrop'),
            UiToast: () => UiDocumentation.tableOfContentsFor('Toast'),
            UiTooltip: () => UiDocumentation.tableOfContentsFor('Tooltip'),
            UiAnimation: () => UiDocumentation.tableOfContentsFor('Animation'),
            UiAnchor: () => UiDocumentation.tableOfContentsFor('Anchor'),
            UiHoverIntent: () =>
              UiDocumentation.tableOfContentsFor('HoverIntent'),
            UiVirtualList: () =>
              UiDocumentation.tableOfContentsFor('VirtualList'),
            UiOverview: () => UiDocumentation.tableOfContentsFor('Overview'),
            UiSelectionBlocks: () =>
              UiDocumentation.tableOfContentsFor('SelectionBlocks'),
            AiOverview: () => AiOverview.tableOfContents,
            AiSkills: () => AiSkills.tableOfContents,
            AiMcp: () => AiMcp.tableOfContents,
            ContentApi: () => ContentApi.tableOfContents,
            About: () => About.tableOfContents,
            Contact: () => Contact.tableOfContents,
            Privacy: () => Privacy.tableOfContents,
            TypingTerminal: () => TypingTerminal.tableOfContents,
          }),
          Match.tag(
            'Home',
            'Newsletter',
            'Blog',
            'BlogPost',
            'Playground',
            'NotFound',
            'Examples',
            'ExampleDetail',
            () => [],
          ),
          Match.exhaustive,
        )

        return {
          pageId: model.route._tag,
          sections: Array.map(currentPageTableOfContents, ({ id }) => id),
        }
      },
      handler: function* () {
        return ({ sections }) =>
          Stream.callback<typeof Message.ChangedActiveSection.Type>(queue =>
            Effect.gen(function* () {
              if (!Array.isReadonlyArrayNonEmpty(sections)) {
                return yield* Effect.never
              }

              yield* Render.afterCommit

              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  const visibleSections = MutableRef.make(
                    HashSet.empty<string>(),
                  )
                  const observer = new IntersectionObserver(
                    entries => {
                      Array.forEach(
                        entries,
                        ({ isIntersecting, target: { id } }) => {
                          if (isIntersecting) {
                            MutableRef.update(visibleSections, HashSet.add(id))
                          } else {
                            MutableRef.update(
                              visibleSections,
                              HashSet.remove(id),
                            )
                          }
                        },
                      )

                      const activeSectionId = Array.findFirst(
                        sections,
                        sectionId =>
                          HashSet.has(
                            MutableRef.get(visibleSections),
                            sectionId,
                          ),
                      )

                      if (Option.isSome(activeSectionId)) {
                        Queue.offerUnsafe(
                          queue,
                          Message.ChangedActiveSection({
                            sectionId: activeSectionId.value,
                          }),
                        )
                      }
                    },
                    { rootMargin: '-100px 0px -80% 0px' },
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
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.layer
