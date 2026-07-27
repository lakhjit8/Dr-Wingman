/** The wing-mark logo: a signal flag folded into a wing shape, echoing the app's green/yellow/red compatibility flags. */
export function WingMark({
  size,
  wing = '#FAFAF9',
  dot = '#C28C4E',
}: {
  size: number
  wing?: string
  dot?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <path
        d="M14 46 C22 20, 40 10, 58 14 C46 18, 34 28, 30 42 C40 38, 50 36, 58 38 C46 46, 30 54, 16 52 Z"
        fill={wing}
      />
      <circle cx="53" cy="21" r="5" fill={dot} />
    </svg>
  )
}
