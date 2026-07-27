import { WingMark } from './WingMark'

/** Dark wingman-900 header block used at the top of each main tab's content (Matches/Profile/Settings/Admin). */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="-mx-4 -mt-6 mb-6 flex items-center justify-between bg-wingman-900 px-4 py-6 sm:-mx-0 sm:mt-0 sm:rounded-2xl sm:px-6">
      <div>
        <div className="font-display text-xl font-bold text-white">{title}</div>
        {subtitle && <div className="mt-1 text-sm text-white/55">{subtitle}</div>}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wingman-600 p-1.5">
        <WingMark size={22} />
      </div>
    </div>
  )
}
