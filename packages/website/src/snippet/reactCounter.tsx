import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  const handleClickIncrement = () => {
    setCount(count => count + 1)
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClickIncrement}>Increment</button>
    </div>
  )
}
