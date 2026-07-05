import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Section = S.Literals(['Dashboard', 'Projects', 'Settings'])
type Section = typeof Section.Type

const sections: ReadonlyArray<Section> = ['Dashboard', 'Projects', 'Settings']

const Model = S.Struct({ current: Section })
type Model = typeof Model.Type

const ClickedSection = m('ClickedSection', { section: Section })
type Message = typeof ClickedSection.Type

const update = (model: Model, message: Message): readonly [Model, []] => [
  evo(model, { current: () => message.section }),
  [],
]

const sectionToHref = (section: Section): string => `#${section.toLowerCase()}`

const sceneView = (model: Model) => {
  const h = html<Message>()

  return view<Section>({
    items: sections,
    ariaLabel: 'Primary',
    toHref: sectionToHref,
    isItemCurrent: section => section === model.current,
    toView: ({ nav, items }) =>
      h.nav(
        nav,
        items.map(item =>
          h.a(
            [...item.link, h.OnClick(ClickedSection({ section: item.value }))],
            [item.value],
          ),
        ),
      ),
  })
}

const navLandmark = Scene.selector('nav')
const dashboardLink = Scene.selector('a[href="#dashboard"]')
const projectsLink = Scene.selector('a[href="#projects"]')
const settingsLink = Scene.selector('a[href="#settings"]')

const initialModel: Model = { current: 'Dashboard' }

describe('Nav', () => {
  describe('rendering', () => {
    it('renders a nav landmark labelled by ariaLabel', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with(initialModel),
        Scene.expect(navLandmark).toExist(),
        Scene.expect(navLandmark).toHaveAttr('aria-label', 'Primary'),
      )
    })

    it('renders one link per item with its href and label', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with(initialModel),
        Scene.expect(dashboardLink).toHaveText('Dashboard'),
        Scene.expect(projectsLink).toHaveText('Projects'),
        Scene.expect(settingsLink).toHaveText('Settings'),
      )
    })
  })

  describe('current item', () => {
    it('marks the current link with aria-current="page" and data-current', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with(initialModel),
        Scene.expect(dashboardLink).toHaveAttr('aria-current', 'page'),
        Scene.expect(dashboardLink).toHaveAttr('data-current'),
      )
    })

    it('leaves non-current links without aria-current or data-current', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with(initialModel),
        Scene.expect(projectsLink).not.toHaveAttr('aria-current'),
        Scene.expect(projectsLink).not.toHaveAttr('data-current'),
        Scene.expect(settingsLink).not.toHaveAttr('aria-current'),
      )
    })

    it('moves aria-current to the newly current link', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with(initialModel),
        Scene.click(projectsLink),
        Scene.expect(projectsLink).toHaveAttr('aria-current', 'page'),
        Scene.expect(dashboardLink).not.toHaveAttr('aria-current'),
      )
    })
  })
})
