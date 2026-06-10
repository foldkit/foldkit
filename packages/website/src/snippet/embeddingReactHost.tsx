import { Runtime } from 'foldkit'
import { useEffect, useRef, useState } from 'react'

import { makeElement } from './widget'

function WidgetPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (containerRef.current === null) {
      return
    }

    // Mount on effect setup, dispose on cleanup. dispose restores the
    // container element, so the ref stays valid across remounts (including
    // strict mode's setup/cleanup/setup sequence).
    const element = makeElement(containerRef.current, { initialCount: 10 })
    const handle = Runtime.embed(element)
    const unsubscribe = handle.ports.countChanged.subscribe(setCount)

    return () => {
      unsubscribe()
      handle.dispose()
    }
  }, [])

  return (
    <div>
      <p>Widget count: {count}</p>
      <div ref={containerRef} />
    </div>
  )
}
