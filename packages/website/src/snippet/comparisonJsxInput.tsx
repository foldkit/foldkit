function EmailInput({
  email,
  onChange,
}: {
  email: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="email"
      value={email}
      placeholder="you@example.com"
      onChange={e => onChange(e.target.value)}
    />
  )
}
