import type { MatchMessage } from '../lib/types'

export function ChatBubble({ message }: { message: MatchMessage }) {
  if (message.sender === 'coach') {
    return (
      <div className="my-3 rounded-2xl border border-wingman-200 bg-wingman-50 p-4 text-sm text-neutral-800">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-wingman-700">
          Dr. Wingman
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    )
  }

  const isUser = message.sender === 'user'
  return (
    <div className={`my-1.5 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'rounded-br-sm bg-wingman-600 text-white'
            : 'rounded-bl-sm bg-neutral-200 text-neutral-900'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
