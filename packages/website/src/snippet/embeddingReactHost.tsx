import { Runtime } from 'foldkit'
import { useEffect, useRef, useState } from 'react'

import { createElement } from './widget'

function WidgetPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const previousDisposal = useRef(Promise.resolve())

  useEffect(() => {
    let isActive = true
    let maybeHandle: Runtime.EmbedHandle | undefined
    let maybeUnsubscribe: (() => void) | undefined

    const mount = async () => {
      await previousDisposal.current

      const container = containerRef.current
      if (!isActive || container === null) {
        return
      }

      const element = createElement(container, { initialCount: 10 })
      const handle = Runtime.embed(element)
      maybeHandle = handle
      maybeUnsubscribe = handle.ports.countChanged.subscribe(setCount)
    }

    void mount()

    return () => {
      isActive = false
      maybeUnsubscribe?.()
      if (maybeHandle !== undefined) {
        previousDisposal.current = maybeHandle.dispose()
      }
    }
  }, [])

  return (
    <div>
      <p>Widget count: {count}</p>
      <div ref={containerRef} />
    </div>
  )
}
