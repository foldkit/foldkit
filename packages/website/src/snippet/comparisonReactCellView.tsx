const CellView = memo(function CellView({
  x,
  y,
  backgroundColor,
  dispatch,
}: Readonly<{
  x: number
  y: number
  backgroundColor: string
  dispatch: React.Dispatch<Action>
}>) {
  const handleMouseDown = useCallback(
    () => dispatch({ type: 'PressedCell', x, y }),
    [dispatch, x, y],
  )
  const handleMouseEnter = useCallback(
    () => dispatch({ type: 'EnteredCell', x, y }),
    [dispatch, x, y],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{ flex: 1, backgroundColor }}
    />
  )
})
