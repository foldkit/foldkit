type Status =
  | { tag: 'Idle' }
  | { tag: 'Loading' }
  | { tag: 'Failed'; error: string }
  | { tag: 'Loaded'; greeting: string }

function Greeting({ status }: { status: Status }) {
  return (
    <div>
      {status.tag === 'Idle' ? null : status.tag === 'Loading' ? (
        <p>Loading…</p>
      ) : status.tag === 'Failed' ? (
        <p>Sorry: {status.error}</p>
      ) : (
        <p>{status.greeting}</p>
      )}
    </div>
  )
}
