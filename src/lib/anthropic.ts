import type { Question } from '../types'
import { checkAnswer, answerConsistentWithWorking } from './answerCheck'

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

ANSWER CORRECTNESS — THIS MATTERS MORE THAN ANYTHING ELSE:
- Solve the question yourself in the "working" field BEFORE you write "correct_answer". Never write the answer first and justify it afterwards.
- "working" must show every calculation step and end with the final result stated plainly.
- "correct_answer" must be the exact final result of your working. If they disagree, your working wins — go back and fix correct_answer.
- A question whose stated answer contradicts its own working is worse than no question at all. Aarav is marked against this field.
- For multiple_choice: exactly one option must equal correct_answer, and correct_answer must be copied verbatim from the options array. Every distractor must be genuinely incorrect — never two defensible answers.

OUTPUT FORMAT: Always respond with valid JSON only, no markdown, no preamble. Emit the fields in exactly the order given in the schema.`

// Field order is deliberate: "working" comes before "correct_answer" so the
// model reasons to the answer instead of asserting one and rationalising it
// afterwards. That ordering is the fix for answer keys that contradicted their
// own explanation.
const QUESTION_SCHEMA = `{
  "question": "string — the full question text",
  "type": "multiple_choice | short_answer | numeric",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
  "working": "string — solve YOUR OWN question here, step by step, every calculation shown, ending with the final result stated plainly. Write this BEFORE correct_answer.",
  "correct_answer": "string — the exact final result of your working (for multiple_choice, copied verbatim from options)",
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

  const alreadyAsked = params.previousQuestions.length > 0
    ? params.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '(none yet — this is the first question)'

  const userContent = `Generate ONE question for topic: "${params.topicName}" (id: ${params.topicId}).
Difficulty: ${params.difficulty}/10.
Week ${params.weekNumber} of 8-week exam prep (ramp difficulty accordingly).

ALREADY ASKED THIS SESSION — your question must be different from every one of these, not just reworded. Use a different scenario, different numbers and a different underlying set-up:
${alreadyAsked}

Respond with JSON matching this schema: ${QUESTION_SCHEMA}`

  const body = {
    model: 'claude-sonnet-4-6',
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

      // Validate MC options actually contain the correct answer.
      // A mismatch throws → the existing loop re-requests once, then falls back.
      if (question.type === 'multiple_choice') {
        const opts = question.options ?? []
        const answer = (question.correct_answer ?? '').trim()
        const hasMatch = answer.length > 0 && opts.some(opt => checkAnswer(opt, answer, opts))
        if (!hasMatch) {
          console.warn(
            `[generateQuestion] MC correct_answer not in options (topic ${params.topicId}). ` +
            `answer="${answer}" options=${JSON.stringify(opts)}`
          )
          throw new Error('MC_OPTION_MISMATCH')
        }
      }

      // Reject any question whose stated answer does not follow from the
      // working the model just showed. This is the guard against the "marked
      // wrong for a right answer" failure — a bad key is caught before Aarav
      // ever sees the question, and the loop regenerates.
      if (!answerConsistentWithWorking(question.correct_answer, question.working ?? '')) {
        console.warn(
          `[generateQuestion] answer/working mismatch (topic ${params.topicId}). ` +
          `answer="${question.correct_answer}" working="${question.working}"`
        )
        throw new Error('ANSWER_WORKING_MISMATCH')
      }

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

export interface AnswerVerdict {
  correct: boolean
  feedback: string
  /** The answer the marker itself derived — what the student should be shown
   *  as "correct answer", which is not always the supplied key. */
  resolvedAnswer: string
  /** True when the supplied answer key disagreed with the marker's own working. */
  keyDisputed: boolean
}

/**
 * Mark an answer by solving the question independently FIRST, then comparing.
 *
 * The old version was handed the answer key up front and told to compare
 * against it, so a bad key marked a right answer wrong — the marker would even
 * show working that reached the student's number and still say "not quite".
 * Here the marker commits to its own result before it is allowed to look at the
 * key, and a student matching either one is marked correct.
 */
export async function evaluateAnswer(params: {
  question: string
  correctAnswer: string
  studentAnswer: string
  topicName: string
  options?: string[] | null
}): Promise<AnswerVerdict> {
  const localFallback = (): AnswerVerdict => ({
    correct: checkAnswer(params.studentAnswer, params.correctAnswer, params.options),
    feedback: '',
    resolvedAnswer: params.correctAnswer,
    keyDisputed: false,
  })

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return localFallback()

  const optionsBlock = params.options?.length
    ? `\nOptions offered: ${params.options.join(' | ')}`
    : ''

  const prompt = `You are marking a Year 6 student's answer. Two rules override everything else: never mark a right answer wrong, and be generous about form.

Question: ${params.question}${optionsBlock}
Topic: ${params.topicName}
Supplied answer key: ${params.correctAnswer}
Student answered: ${params.studentAnswer}

STEP 1 — Solve the question YOURSELF, from scratch, showing every step. Do this before you consider the supplied key. The key was written by another model and is occasionally wrong; your own working is the tie-breaker.
STEP 2 — Compare your own result with the supplied key and say whether they agree.
STEP 3 — Mark the student CORRECT if their answer matches EITHER your own result OR the supplied key.

Evaluation rules:
- Accept mathematically equivalent forms: 0 = 0/12, 1/2 = 0.5, 50% = 0.5, 2/4 = 1/2, etc.
- Accept answers with or without units when the unit is clear from context
- Accept equivalent fractions, decimals, and percentages
- Accept a bare option letter, a bare option text, or the full labelled option as the same answer
- Accept correct synonyms and near-synonyms for verbal questions
- Accept answers with minor spelling errors if clearly the right word
- Accept if the student wrote extra working alongside the correct answer
- Only mark incorrect if the mathematical/conceptual value is genuinely wrong

Feedback rules:
- Never state a "correct answer" that contradicts your own working
- If the supplied key was wrong and the student was right, simply confirm they are right — do not mention the key or the disagreement
- Encouraging tone; never the words "wrong" or "incorrect" — use "not quite" or "close"

Respond with JSON only, no markdown, fields in exactly this order:
{"working": "your own step-by-step solution", "independent_answer": "your own final answer", "key_matches_working": true/false, "correct": true/false, "feedback": "1-2 encouraging sentences. If correct: briefly reinforce why. If not quite right: explain the gap gently, referencing what they wrote."}`

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
        // Sonnet, not Haiku: this call decides whether Aarav is told he got it
        // wrong. Marking accuracy is worth the extra second.
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error('eval API error')
    const data = await response.json() as { content: { type: string; text: string }[] }
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as {
      working?: string
      independent_answer?: string
      key_matches_working?: boolean
      correct?: boolean
      feedback?: string
    }

    const independent = (parsed.independent_answer ?? '').trim()
    const keyDisputed = independent.length > 0 && (
      parsed.key_matches_working === false ||
      !checkAnswer(independent, params.correctAnswer, params.options)
    )

    // Belt and braces: whatever the marker concluded, a student answer that
    // matches the marker's own derived answer — or the key — is correct.
    const correct = parsed.correct === true ||
      (independent.length > 0 && checkAnswer(params.studentAnswer, independent, params.options)) ||
      checkAnswer(params.studentAnswer, params.correctAnswer, params.options)

    if (keyDisputed) {
      console.warn(
        `[evaluateAnswer] answer key disputed. key="${params.correctAnswer}" ` +
        `marker="${independent}" working="${parsed.working ?? ''}"`
      )
    }

    return {
      correct,
      feedback: parsed.feedback ?? '',
      resolvedAnswer: keyDisputed && independent ? independent : params.correctAnswer,
      keyDisputed,
    }
  } catch {
    return localFallback()
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
        model: 'claude-sonnet-4-6',
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
