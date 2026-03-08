import { useEffect, useRef, useState } from 'react'

const TICK_INTERVAL_MS = 1000

function Counter() {
  const intervalRef = useRef<number>()

  const [count, setCount] = useState(0)
  const [isAutoCounting, setIsPlaying] = useState(false)

  const handleClickIncrement = () => {
    setCount(count => count + 1)
  }

  const handleClickAutoCount = () => {
    setIsPlaying(isAutoCounting => !isAutoCounting)
  }

  useEffect(() => {
    if (isAutoCounting) {
      intervalRef.current = setInterval(() => {
        setCount(count => count + 1)
      }, TICK_INTERVAL_MS)
    }

    return () => clearInterval(intervalRef.current)
  }, [isAutoCounting])

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClickIncrement}>Increment</button>
      <button onClick={handleClickAutoCount}>
        {isAutoCounting ? 'Stop' : 'Auto-Count'}
      </button>
    </div>
  )
}
