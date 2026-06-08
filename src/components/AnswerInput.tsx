import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type { Question } from '../types'

interface AnswerInputProps {
  question: Question
  onSubmit: (answer: string) => void
  disabled: boolean
  hintUsed: boolean
  onHintRequest: () => void
}

export function AnswerInput({ question, onSubmit, disabled, hintUsed, onHintRequest }: AnswerInputProps) {
  const [textValue, setTextValue] = useState('')

  function handleTextSubmit() {
    const trimmed = textValue.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleTextSubmit()
  }

  const showHintButton = !hintUsed && !disabled

  if (question.type === 'multiple_choice') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {(question.options ?? []).map((option, i) => (
            <button
              key={i}
              onClick={() => !disabled && onSubmit(option)}
              disabled={disabled}
              className="w-full text-left px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white
                         hover:bg-gray-800 hover:border-blue-500 transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {option}
            </button>
          ))}
        </div>

        {showHintButton && (
          <HintButton hintUsed={hintUsed} hint={question.hint} onHintRequest={onHintRequest} />
        )}
      </div>
    )
  }

  // short_answer or numeric
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type={question.type === 'numeric' ? 'number' : 'text'}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={question.type === 'numeric' ? 'Enter a number…' : 'Type your answer…'}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white
                     placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleTextSubmit}
          disabled={disabled || !textValue.trim()}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl
                     transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>

      {showHintButton && (
        <HintButton hintUsed={hintUsed} hint={question.hint} onHintRequest={onHintRequest} />
      )}
    </div>
  )
}

interface HintButtonProps {
  hintUsed: boolean
  hint: string
  onHintRequest: () => void
}

function HintButton({ hintUsed, hint, onHintRequest }: HintButtonProps) {
  const [showHint, setShowHint] = useState(false)

  function handleClick() {
    if (!hintUsed) onHintRequest()
    setShowHint(true)
  }

  if (showHint) {
    return (
      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-amber-300 text-sm">{hint}</p>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400
                 transition-colors duration-150 px-3 py-1.5 rounded-lg hover:bg-amber-500/10"
    >
      <Lightbulb size={15} />
      <span>Hint <span className="text-gray-500">(−30% XP)</span></span>
    </button>
  )
}
