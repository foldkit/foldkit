function SaveButton({
  isSaving,
  onSave,
}: {
  isSaving: boolean
  onSave: () => void
}) {
  return (
    <button type="button" disabled={isSaving} onClick={onSave}>
      Save
    </button>
  )
}
