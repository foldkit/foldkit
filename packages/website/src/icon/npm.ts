import { Html, html } from 'foldkit/html'

export const npm = <ParentMessage>(className = 'w-5 h-5'): Html => {
  const h = html<ParentMessage>()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.ViewBox('0 0 780 250'),
      h.Fill('currentColor'),
    ],
    [
      h.path(
        [
          h.D(
            'M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z',
          ),
        ],
        [],
      ),
    ],
  )
}
