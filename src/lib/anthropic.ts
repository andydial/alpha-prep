import type { Question } from '../types'

const SYSTEM_PROMPT = `You are an expert Australian tutor preparing Aarav, a high-achieving Year 6 student, for the EDSC Alpha (accelerated learning) entrance exam in Victoria. Aarav is near the top of his class and thrives on challenge — he should always feel stretched, never bored.

STUDENT PROFILE:
- Name: Aarav
- Year 6, high achiever, competitive mindset
- Responds well to challenge and genuine encouragement
- Should always feel like he is levelling up, not just doing homework

QUESTION RULES:
- Difficulty 1-10 where 5 = standard Year 6, 7 = Year 7-8 challenge, 10 = elite selective entry
- Never generate a question below difficulty 5 for Aarav
- Default starting difficulty is 6 — push upward as performance warrants
- Questions must require genuine reasoning, not just recall
- Multi-step problems preferred for maths
- For maths: show clear working steps in explanations
- For reading: reference the key part of the text in explanations
- For verbal/abstract: explain the rule or pattern that makes the answer correct
- Never repeat a question from the same session
- Australian English spelling throughout (colour, maths, programme, fulfil, etc.)

TONE FOR EXPLANATIONS:
- Always encouraging — frame wrong answers as "great attempt, here's the insight"
- For correct answers: reinforce WHY it's correct, add a pro tip or deeper insight
- Never say "wrong" or "incorrect" — say "not quite" or "close — here's the trick"
- Treat Aarav as a capable, intelligent student who can handle stretch content
- Occasionally acknowledge difficulty: "This is a tough one — well done for attempting it"

OUTPUT FORMAT: Always respond with valid JSON only, no markdown, no preamble.`

const QUESTION_SCHEMA = `{
  "question": "string — the full question text",
  "type": "multiple_choice | short_answer | numeric",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
  "correct_answer": "string — exact answer",
  "difficulty": number 1-10,
  "topic_id": "string — matches topic id",
  "hint": "string — one sentence hint without giving away answer",
  "explanation": "string — clear explanation of why the answer is correct, 2-4 sentences"
}`

function parseQuestionJSON(text: string): Question {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as Question
}

export async function generateQuestion(params: {
  topicId: string
  topicName: string
  difficulty: number
  previousQuestions: string[]
  weekNumber: number
}): Promise<Question> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY')

  const userContent = `Generate ONE question for topic: "${params.topicName}" (id: ${params.topicId}).
Difficulty: ${params.difficulty}/10.
Week ${params.weekNumber} of 8-week exam prep (ramp difficulty accordingly).
Previous questions this session (do not repeat): ${params.previousQuestions.slice(-5).join(' | ') || 'none yet'}
Respond with JSON matching this schema: ${QUESTION_SCHEMA}`

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  }

  let lastError: Error | null = null

  // Retry once on failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Anthropic API ${response.status}: ${errText}`)
      }

      const data = await response.json() as { content: { type: string; text: string }[] }
      const textContent = data.content.find(c => c.type === 'text')
      if (!textContent) throw new Error('No text content in Anthropic response')

      const question = parseQuestionJSON(textContent.text)

      // Enforce difficulty floor
      if (question.difficulty < 5) question.difficulty = 5

      return question
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === 0) {
        // Brief pause before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError ?? new Error('Failed to generate question after 2 attempts')
}

export async function evaluateAnswer(params: {
  question: string
  correctAnswer: string
  studentAnswer: string
  topicName: string
}): Promise<{ correct: boolean; feedback: string }> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return { correct: false, feedback: '' }

  const prompt = `You are evaluating a Year 6 student's answer. Be generous — accept all equivalent forms.

Question: ${params.question}
Correct answer: ${params.correctAnswer}
Student answered: ${params.studentAnswer}
Topic: ${params.topicName}

Evaluation rules:
- Accept mathematically equivalent forms: 0 = 0/12, 1/2 = 0.5, 50% = 0.5, 2/4 = 1/2, etc.
- Accept answers with or without units when the unit is clear from context
- Accept equivalent fractions, decimals, and percentages
- Accept correct synonyms and near-synonyms for verbal questions
- Accept answers with minor spelling errors if clearly the right word
- Accept if the student wrote extra working alongside the correct answer
- Only mark incorrect if the mathematical/conceptual value is genuinely wrong

Respond with JSON only, no markdown:
{"correct": true/false, "feedback": "1-2 encouraging sentences. If correct: briefly reinforce why. If not quite right: explain the gap gently without saying 'wrong' or 'incorrect' — say 'not quite' or 'close'. Reference what they wrote."}`

  // Use haiku for speed — evaluation calls happen on every non-MC answer
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error('eval API error')
    const data = await response.json() as { content: { type: string; text: string }[] }
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    return JSON.parse(cleaned) as { correct: boolean; feedback: string }
  } catch {
    // Fallback to string match if AI eval fails
    const norm = (s: string) => s.toLowerCase().replace(/^[a-d]\)\s*/i, '').trim()
    return { correct: norm(params.studentAnswer) === norm(params.correctAnswer), feedback: '' }
  }
}

export async function generateSessionSummary(params: {
  topicNames: string[]
  correctCount: number
  totalCount: number
  xpEarned: number
}): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return "Great session — keep it up!"

  const score = Math.round((params.correctCount / params.totalCount) * 100)
  const prompt = `Write a 1-2 sentence encouraging message for Aarav after a study session.
Score: ${params.correctCount}/${params.totalCount} (${score}%)
Topics covered: ${params.topicNames.join(', ')}
XP earned: ${params.xpEarned}
Tone: warm, genuine, treats him as a capable high-achiever. Never use the word "wrong" or "failed".
Respond with just the message text, no quotes, no JSON.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) return "Outstanding effort — keep pushing!"
    const data = await response.json() as { content: { type: string; text: string }[] }
    return data.content.find(c => c.type === 'text')?.text ?? "Great session — keep it up!"
  } catch {
    return "Great session — keep pushing for that Alpha!"
  }
}
