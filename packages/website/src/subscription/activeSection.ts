import {
  Array,
  Effect,
  Function,
  HashSet,
  Match as M,
  MutableRef,
  Option,
  Stream,
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
    const currentPageTableOfContents = M.value(model.route).pipe(
      M.tag('WhyFoldkit', () => Page.WhyFoldkit.tableOfContents),
      M.tag(
        'GettingStarted',
        () => Page.GettingStarted.tableOfContents,
      ),
      M.tag(
        'ArchitectureAndConcepts',
        () => Page.ArchitectureAndConcepts.tableOfContents,
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
        'BestPractices',
        () => Page.BestPractices.tableOfContents,
      ),
      M.tag(
        'ProjectOrganization',
        () => Page.ProjectOrganization.tableOfContents,
      ),
      M.tag(
        'AdvancedPatterns',
        () => Page.AdvancedPatterns.tableOfContents,
      ),
      M.tag(
        'ApiReference',
        () => Page.ApiReference.apiReferenceTableOfContents,
      ),
      M.tag('FoldkitUi', () => Page.FoldkitUi.tableOfContents),
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
