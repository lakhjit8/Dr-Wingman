import type { MatchMessage } from '../lib/types'
import { Collapsible } from './Collapsible'
import { FlagList } from './FlagIcon'
import { CopyButton } from './CopyButton'

interface MatchAnalysisMetadata {
  [key: string]: unknown
  pace?: string
  investment_read?: string
  compatibility_notes?: string
  bridge_strategy?: string
  green_flags?: string[]
  yellow_flags?: string[]
  red_flags?: string[]
  opening_messages?: string[]
}

interface MessageCoachingMetadata {
  [key: string]: unknown
  reading?: string
  translation?: string
  suggested_replies?: string[]
  momentum_note?: string
}

function isMatchAnalysis(m: Record<string, unknown>): m is MatchAnalysisMetadata {
  return 'pace' in m || 'opening_messages' in m || 'green_flags' in m
}

function isMessageCoaching(m: Record<string, unknown>): m is MessageCoachingMetadata {
  return 'suggested_replies' in m || 'reading' in m
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function CoachAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wingman-600 text-xs font-semibold text-white">
      DW
    </span>
  )
}

function CoachHeader({ createdAt }: { createdAt: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <CoachAvatar />
      <span className="text-xs font-semibold uppercase tracking-wide text-wingman-700">Dr. Wingman</span>
      <span className="font-mono text-[11px] text-neutral-400">{formatTime(createdAt)}</span>
    </div>
  )
}

export function ChatBubble({ message }: { message: MatchMessage }) {
  if (message.sender === 'coach') {
    const metadata = (message.metadata ?? {}) as Record<string, unknown>

    if (isMatchAnalysis(metadata)) {
      return (
        <div className="my-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <CoachHeader createdAt={message.created_at} />

          {(metadata.green_flags?.length || metadata.yellow_flags?.length || metadata.red_flags?.length) && (
            <div className="mb-3 space-y-1.5">
              <FlagList kind="green" items={metadata.green_flags ?? []} />
              <FlagList kind="yellow" items={metadata.yellow_flags ?? []} />
              <FlagList kind="red" items={metadata.red_flags ?? []} />
            </div>
          )}

          {(metadata.compatibility_notes || metadata.investment_read || metadata.bridge_strategy) && (
            <div className="mb-3 border-b border-neutral-100 pb-3">
              <Collapsible label="See the reasoning" openLabel="Hide the reasoning">
                <div className="space-y-2 text-sm leading-relaxed text-neutral-700">
                  {metadata.compatibility_notes && <p>{metadata.compatibility_notes}</p>}
                  {metadata.investment_read && (
                    <p>
                      <span className="font-medium text-neutral-900">Investment read: </span>
                      {metadata.investment_read}
                    </p>
                  )}
                  {metadata.bridge_strategy && (
                    <p>
                      <span className="font-medium text-neutral-900">Strategy: </span>
                      {metadata.bridge_strategy}
                    </p>
                  )}
                </div>
              </Collapsible>
            </div>
          )}

          {!!metadata.opening_messages?.length && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Opening messages to consider
              </p>
              <div className="space-y-2">
                {metadata.opening_messages.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800"
                  >
                    <p className="flex-1">{m}</p>
                    <CopyButton text={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (isMessageCoaching(metadata)) {
      return (
        <div className="my-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <CoachHeader createdAt={message.created_at} />

          {(metadata.reading || metadata.translation) && (
            <div className="mb-3 border-b border-neutral-100 pb-3">
              <Collapsible label="See the reasoning" openLabel="Hide the reasoning">
                <div className="space-y-2 text-sm leading-relaxed text-neutral-700">
                  {metadata.reading && <p>{metadata.reading}</p>}
                  {metadata.translation && <p>{metadata.translation}</p>}
                </div>
              </Collapsible>
            </div>
          )}

          {!!metadata.suggested_replies?.length && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Try one of these</p>
              <div className="space-y-2">
                {metadata.suggested_replies.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800"
                  >
                    <p className="flex-1">{m}</p>
                    <CopyButton text={m} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {metadata.momentum_note && (
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">{metadata.momentum_note}</p>
          )}
        </div>
      )
    }

    // Fallback for coach messages without recognized structured metadata (legacy data).
    return (
      <div className="my-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <CoachHeader createdAt={message.created_at} />
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{message.content}</div>
      </div>
    )
  }

  const isUser = message.sender === 'user'
  return (
    <div className={`my-1.5 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'rounded-br-sm bg-wingman-600 text-white'
              : 'rounded-bl-sm border border-neutral-200 bg-white text-neutral-900'
          }`}
        >
          {message.content}
        </div>
        <span className="mt-0.5 px-1 font-mono text-[11px] text-neutral-400">{formatTime(message.created_at)}</span>
      </div>
    </div>
  )
}
