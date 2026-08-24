import type { Domain, Question, WritingMark } from '../types'
import { checkAnswer, findQuestionDefect, type QuestionDefect } from './answerCheck'
import { EXAM_CONTEXT, DOMAIN_GUIDANCE, TOPIC_GUIDANCE } from './examSpec'

const SYSTEM_PROMPT = `You are an expert Australian tutor preparing Aarav, a high-achieving Year 6 student, for the EDSC Alpha (accelerated learning) entrance exam at East Doncaster Secondary College in Victoria. Aarav is near the top of his class and thrives on challenge — he should always feel stretched, never bored.

${EXAM_CONTEXT}

STUDENT PROFILE:
- Name: Aarav
- Year 6, high achiever, competitive mindset
- Responds well to challenge and genuine encouragement
- Should always feel like he is levelling up, not just doing homework

QUESTION RULES — MATCH THE PAPER, NOT A TEXTBOOK:
- Every question is MULTIPLE CHOICE with exactly four options, labelled "A) ", "B) ", "C) ", "D) ".
  Never produce short_answer or numeric for an exam-section question.
- A strong candidate must be able to solve it in about 60 seconds, without a calculator.
- Difficulty is calibrated to THIS exam: 5 = a routine EduTest item at this year level,
  7 = a hard EduTest item, 9-10 = a top-percentile item that separates the strongest candidates.
  Never generate below difficulty 5.
- Distractors must be the mistakes a good student actually makes — the wrong operation, the
  forgotten step, the unconverted unit, the plausible misreading. Never filler, and never two
  defensible answers.
- Questions must require genuine reasoning, not recall of a fact.
- Abstract, spatial and non-verbal pattern questions are NOT on this paper. Never produce one.
- For maths: show clear working steps in explanations.
- For reading: reference the key part of the passage in explanations.
- For verbal and numerical reasoning: explain the rule or relationship that makes the answer correct,
  and say how a candidate could have spotted it quickly.
- Never repeat a question from the same session.
- Australian English spelling and Australian contexts throughout (colour, maths, metre, dollars).

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
- BUILD THE OPTIONS AFTER YOU HAVE THE ANSWER. Solve first in "working", then write four options one of which IS your result. Never write plausible-looking options and then try to pick one.
- The "explanation" must reach the SAME result as "working" and "correct_answer". If while writing the explanation you realise the answer is different, you have made an error — the whole question is void. Start the JSON again with the corrected answer and matching options rather than explaining your way out of it.
- NEVER write a correction, a retraction or second thoughts into any field. No "wait", no "let me recheck", no "correcting the options", no "actually the answer is". Aarav reads the explanation verbatim; it must be a clean, confident explanation of one answer.

OUTPUT FORMAT: Always respond with valid JSON only, no markdown, no preamble. Emit the fields in exactly the order given in the schema.`

// Field order is deliberate: "working" comes before "correct_answer" so the
// model reasons to the answer instead of asserting one and rationalising it
// afterwards. That ordering is the fix for answer keys that contradicted their
// own explanation.
const QUESTION_SCHEMA = `{
  "question": "string — the full question text",
  "type": "multiple_choice",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] — exactly four,
  "working": "string — solve YOUR OWN question here, step by step, every calculation shown, ending with the final result stated plainly. Write this BEFORE correct_answer.",
  "correct_answer": "string — the exact final result of your working (for multiple_choice, copied verbatim from options)",
  "difficulty": number 1-10,
  "topic_id": "string — matches topic id",
  "hint": "string — one sentence hint without giving away answer",
  "explanation": "string — clear explanation of why the answer is correct, 2-4 sentences"
}`

/**
 * What to tell the model when a generated question is rejected.
 *
 * Retrying with the byte-identical request mostly reproduced the same defect.
 * Naming the fault turns the second attempt into a correction rather than a
 * coin flip.
 */
const DEFECT_FEEDBACK: Record<QuestionDefect, string> = {
  NOT_MULTIPLE_CHOICE: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: it was not multiple choice. Every question on this paper is multiple choice with exactly four options.',
  WRONG_OPTION_COUNT: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: it did not have exactly four options. Give exactly four, labelled "A) " to "D) ".',
  MC_OPTION_MISMATCH: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: correct_answer did not appear in the options. Solve the question first, then build the four options around the result you got, and copy correct_answer verbatim from that option.',
  EMPTY_WORKING: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: the "working" field was empty. Solve the question step by step in "working" before you write correct_answer.',
  ANSWER_WORKING_MISMATCH: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: correct_answer was a value your own working never reached. The working is the truth — set correct_answer to the result the working ends with.',
  WORKING_CONTRADICTS_ANSWER: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: the working stated a final answer different from correct_answer. Solve it once, carefully, and make every field agree.',
  EXPLANATION_CONTRADICTS_ANSWER: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: the explanation concluded a different answer from correct_answer, and the options did not contain the real answer. Solve the question completely FIRST, then build the four options so that one of them is your result, and make working, correct_answer and explanation all state that same result.',
  SELF_CORRECTING_TEXT: 'YOUR PREVIOUS ATTEMPT WAS REJECTED: the text contained second thoughts ("wait", "let me recheck", "correcting the options"). Work the problem out before you start writing. Every field must read as one clean, confident answer with no corrections.',
}

function parseQuestionJSON(text: string): Question {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as Question
}

export async function generateQuestion(params: {
  topicId: string
  topicName: string
  /** Which exam section this question belongs to — drives the section guidance. */
  domain: Domain
  difficulty: number
  previousQuestions: string[]
  weekNumber: number
}): Promise<Question> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY')

  const alreadyAsked = params.previousQuestions.length > 0
    ? params.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '(none yet — this is the first question)'

  const sectionGuidance = DOMAIN_GUIDANCE[params.domain as keyof typeof DOMAIN_GUIDANCE]
    ?? DOMAIN_GUIDANCE.maths
  const itemGuidance = TOPIC_GUIDANCE[params.topicId] ?? params.topicName

  const userContent = `SECTION — ${sectionGuidance}

Generate ONE exam question for topic: "${params.topicName}" (id: ${params.topicId}).
Item type for this topic: ${itemGuidance}
Difficulty: ${params.difficulty}/10 on the scale defined in your instructions.
Week ${params.weekNumber} of 8 in the run-up to the exam.

ALREADY ASKED THIS SESSION — your question must be different from every one of these, not just reworded. Use a different scenario, different numbers and a different underlying set-up:
${alreadyAsked}

Respond with JSON matching this schema: ${QUESTION_SCHEMA}`

  let lastError: Error | null = null
  let lastDefect: QuestionDefect | null = null

  // Three attempts, and each retry is told what was wrong with the last one —
  // repeating the identical request and hoping for a different answer wasted
  // the retry most of the time.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const correction = lastDefect ? `\n\n${DEFECT_FEEDBACK[lastDefect]}` : ''
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
          max_tokens: 1400,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent + correction }],
        }),
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

      // One gate for every way a generated question can be untrustworthy —
      // wrong format, a key that matches no option, a key its own working or
      // explanation contradicts, or text in which the model visibly changes its
      // mind. See findQuestionDefect in answerCheck.ts. Aarav is marked against
      // this key, so a defective question is regenerated rather than served.
      const defect = findQuestionDefect(question)
      if (defect) {
        lastDefect = defect
        console.warn(
          `[generateQuestion] ${defect} (topic ${params.topicId}). ` +
          `answer="${question.correct_answer}" options=${JSON.stringify(question.options)} ` +
          `working="${(question.working ?? '').slice(0, 200)}"`
        )
        throw new Error(defect)
      }

      return question
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < 2) {
        // Brief pause before retry
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    }
  }

  throw lastError ?? new Error('Failed to generate question after 3 attempts')
}

export interface AnswerVerdict {
  correct: boolean
  feedback: string
  /** The answer the marker itself derived — what the student should be shown
   *  as "correct answer", which is not always the supplied key. */
  resolvedAnswer: string
  /** True when the supplied answer key disagreed with the marker's own working. */
  keyDisputed: boolean
  /** True when the marker could not be reached at all, so `resolvedAnswer` is
   *  the unverified generated key rather than a checked result. */
  markerUnavailable?: boolean
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
  /**
   * Last resort when the marker cannot be reached.
   *
   * This is the path that let a bad answer key reach Aarav: the marker failed,
   * this returned the unverified key with empty feedback, and the UI showed the
   * key as correct alongside the question's own rambling explanation — with
   * nothing anywhere saying the marker had not run. `markerUnavailable` now
   * makes that visible to the caller.
   */
  const localFallback = (): AnswerVerdict => ({
    correct: checkAnswer(params.studentAnswer, params.correctAnswer, params.options),
    feedback: '',
    resolvedAnswer: params.correctAnswer,
    keyDisputed: false,
    markerUnavailable: true,
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

  // Two attempts. A single try meant one truncated or rate-limited response
  // silently handed Aarav the unverified key — measured output runs 430-600
  // tokens, so the old 700 cap had almost no headroom on a verbose case.
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
      body: JSON.stringify({
        // Sonnet, not Haiku: this call decides whether Aarav is told he got it
        // wrong. Marking accuracy is worth the extra second.
        model: 'claude-sonnet-4-6',
        max_tokens: 1600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`eval API ${response.status}`)
    const data = await response.json() as {
      content: { type: string; text: string }[]
      stop_reason?: string
    }
    if (data.stop_reason === 'max_tokens') throw new Error('eval response truncated')
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
      markerUnavailable: false,
    }
  } catch (err) {
    console.error(`[evaluateAnswer] marking attempt ${attempt + 1} failed:`, err)
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 600))
  }
  }

  console.error(
    '[evaluateAnswer] marker unavailable after 2 attempts — falling back to the ' +
    'unverified generated key. The answer shown to the student has NOT been checked.'
  )
  return localFallback()
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


// ── Reading comprehension sets ──────────────────────────────────────────────

interface ReadingSetResponse {
  passage_type?: string
  passage?: string
  questions?: Question[]
}

/**
 * One passage with several questions on it — the shape the real paper uses.
 *
 * Generating reading questions one at a time produced a new mini-passage for
 * every question, which is not how the section works and gave Aarav no practice
 * at holding a text in mind across four questions. This asks for the passage
 * once and four questions against it, each testing a different reading skill.
 *
 * Any question that fails validation is dropped rather than served; the caller
 * falls back to single-question generation if fewer than two survive.
 */
export async function generateReadingSet(params: {
  topicIds: string[]
  topicNames: string[]
  count: number
  difficulty: number
  weekNumber: number
  previousQuestions: string[]
}): Promise<Question[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY')

  const count = Math.max(2, Math.min(5, params.count))
  const skills = params.topicIds
    .map(id => `- ${id}: ${TOPIC_GUIDANCE[id] ?? id}`)
    .join('\n')
  const alreadyAsked = params.previousQuestions.length > 0
    ? params.previousQuestions.slice(-12).map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '(none yet)'

  const userContent = `SECTION — ${DOMAIN_GUIDANCE.reading}

Write ONE passage of 130-220 words and ${count} multiple-choice questions about it.

Passage requirements:
- Pick ONE type at random: literary (a narrative extract), informational (a factual article) or persuasive (an opinion piece).
- Australian context and Australian English. Suitable for a strong Year 6 reader.
- Rich enough that inference and tone questions are genuinely answerable from it.
- Do NOT repeat the subject matter of these passages already used this session:
${alreadyAsked}

Question requirements:
- Each of the ${count} questions must test a DIFFERENT reading skill, chosen from:
${skills}
- Set each question's topic_id to the id of the skill it tests.
- Every question is multiple choice with exactly four options labelled "A) " ... "D) ".
- Every question must be answerable from the passage alone.
- Difficulty around ${params.difficulty}/10 on the scale in your instructions.
- Each distractor must be a misreading a careless but capable student would actually make.

Respond with JSON only, no markdown:
{
  "passage_type": "literary | informational | persuasive",
  "passage": "the passage text",
  "questions": [
    {
      "question": "string",
      "type": "multiple_choice",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "working": "string — locate the evidence in the passage and reason to the answer BEFORE writing correct_answer",
      "correct_answer": "string — copied verbatim from options",
      "difficulty": number 1-10,
      "topic_id": "one of the ids listed above",
      "hint": "string — one sentence, no answer",
      "explanation": "string — 2-4 sentences quoting or pointing at the part of the passage that decides it"
    }
  ]
}`

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
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API ${response.status}`)
  const data = await response.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(c => c.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as ReadingSetResponse

  const passage = (parsed.passage ?? '').trim()
  if (!passage) throw new Error('READING_SET_NO_PASSAGE')

  const validIds = new Set(params.topicIds)
  const usable = (parsed.questions ?? []).filter(q => {
    if (!q?.question) return false
    // Same integrity gate as generateQuestion — a reading question whose key
    // its own explanation contradicts is exactly as dangerous as a maths one.
    const defect = findQuestionDefect(q)
    if (defect) {
      console.warn(`[generateReadingSet] dropping question: ${defect} — "${q.question?.slice(0, 60)}"`)
      return false
    }
    return true
  }).map(q => ({
    ...q,
    passage,
    difficulty: Math.max(5, Math.min(10, q.difficulty || params.difficulty)),
    topic_id: validIds.has(q.topic_id) ? q.topic_id : params.topicIds[0],
  }))

  if (usable.length < 2) throw new Error('READING_SET_TOO_FEW_VALID')
  return usable
}

// ── Written Expression ──────────────────────────────────────────────────────

export interface WritingPrompt {
  prompt: string
  style: 'narrative' | 'persuasive'
  guidance: string
}

/** One EduTest-style writing stimulus: a single sentence or short scenario. */
export async function generateWritingPrompt(params: {
  style: 'narrative' | 'persuasive'
  weekNumber: number
}): Promise<WritingPrompt> {
  const fallback: WritingPrompt = params.style === 'persuasive'
    ? {
        prompt: 'Every student should have to learn a musical instrument at school. Do you agree?',
        style: 'persuasive',
        guidance: 'Take a clear position in your first sentence, give three reasons with an example each, and answer one objection before you finish.',
      }
    : {
        prompt: 'The last light in the street went out, and only then did she notice the door was open.',
        style: 'narrative',
        guidance: 'Start in the moment, show what the character feels through what they do, and give the piece a definite ending rather than trailing off.',
      }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  const userContent = `${DOMAIN_GUIDANCE.writing}

Write ONE ${params.style} writing prompt for Aarav, week ${params.weekNumber} of 8 before the exam.
It must be a single sentence or a two-sentence scenario, openable immediately by any Year 6 student with no specialist knowledge, and it must leave room for a strong writer to stand out.

Respond with JSON only, no markdown:
{"prompt": "the stimulus", "guidance": "one sentence of advice on what the markers reward for this style"}`

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
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })
    if (!response.ok) return fallback
    const data = await response.json() as { content: { type: string; text: string }[] }
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { prompt?: string; guidance?: string }
    if (!parsed.prompt) return fallback
    return { prompt: parsed.prompt, style: params.style, guidance: parsed.guidance ?? fallback.guidance }
  } catch {
    return fallback
  }
}

const clampCriterion = (n: unknown): number =>
  Math.max(0, Math.min(4, Math.round(typeof n === 'number' ? n : 2)))

/**
 * Marks a written response against the four EduTest criteria, 0-4 each.
 *
 * On any failure this returns a neutral mark rather than throwing — a piece
 * Aarav has just spent fifteen minutes on must never be lost because an API
 * call failed.
 */
export async function markWritingResponse(params: {
  prompt: string
  style: string
  text: string
}): Promise<WritingMark> {
  const wordCount = params.text.trim().split(/\s+/).filter(Boolean).length
  const neutral: WritingMark = {
    ideas: 2, structure: 2, language: 2, conventions: 2, total: 8,
    feedback: 'Marking was unavailable this time, so this piece has been recorded without a score. Your writing is saved — well done for finishing it under time pressure.',
    strengths: [],
    improvements: [],
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || wordCount === 0) return neutral

  const prompt = `You are marking a Year 6 student's Written Expression response for the EduTest paper used for EDSC Alpha entry. The student had 15 minutes and no planning time — mark accordingly, and be fair about what is achievable in that window.

Task style: ${params.style}
Prompt given: ${params.prompt}
Word count: ${wordCount}

Student's response:
"""
${params.text}
"""

Mark each of the four EduTest criteria from 0 to 4:
- ideas: quality, originality and development of content
- structure: organisation, paragraphing, and how the piece opens and closes
- language: vocabulary, sentence variety and control of tone
- conventions: spelling, punctuation and grammar

Marking rules:
- 2 is a solid Year 6 response; 3 is clearly above the cohort; 4 is exceptional for the time allowed.
- Be honest — inflating the score teaches him nothing — but the tone must stay encouraging.
- Never use the words "wrong", "bad" or "poor". Frame gaps as the next thing to work on.
- Give at most three strengths and at most three improvements, each one short and specific to what he actually wrote.

Respond with JSON only, no markdown:
{"ideas": 0-4, "structure": 0-4, "language": 0-4, "conventions": 0-4, "feedback": "2-3 sentences to Aarav", "strengths": ["..."], "improvements": ["..."]}`

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) return neutral
    const data = await response.json() as { content: { type: string; text: string }[] }
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<WritingMark>

    const ideas = clampCriterion(parsed.ideas)
    const structure = clampCriterion(parsed.structure)
    const language = clampCriterion(parsed.language)
    const conventions = clampCriterion(parsed.conventions)

    return {
      ideas, structure, language, conventions,
      total: ideas + structure + language + conventions,
      feedback: parsed.feedback ?? neutral.feedback,
      strengths: (parsed.strengths ?? []).slice(0, 3),
      improvements: (parsed.improvements ?? []).slice(0, 3),
    }
  } catch {
    return neutral
  }
}
