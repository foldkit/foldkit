import { useEffect, useState } from 'react'

const TICK_INTERVAL_MS = 1000

function Counter() {
  const [count, setCount] = useState(0)
  const [isAutoCounting, setIsPlaying] = useState(false)

  const handleClickIncrement = () => {
    setCount(count => count + 1)
  }

  const handleClickAutoCount = () => {
    setIsPlaying(isAutoCounting => !isAutoCounting)
  }

  useEffect(() => {
    if (!isAutoCounting) {
      return
    }

    const intervalId = setInterval(() => {
      setCount(count => count + 1)
    }, TICK_INTERVAL_MS)

    return () => clearInterval(intervalId)
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
