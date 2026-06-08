import type { Question } from '../types'

export const FALLBACK_QUESTIONS: Question[] = [
  {
    question: "What is 3/4 + 1/3?",
    type: 'multiple_choice',
    options: ["A) 1 1/12", "B) 4/7", "C) 1 1/4", "D) 2/3"],
    correct_answer: "A) 1 1/12",
    difficulty: 6,
    topic_id: 'maths_fractions',
    hint: "Find a common denominator first.",
    explanation: "To add 3/4 + 1/3, find the common denominator 12: 9/12 + 4/12 = 13/12 = 1 1/12. Always convert to equivalent fractions before adding."
  },
  {
    question: "If a train travels at 80 km/h, how far does it travel in 45 minutes?",
    type: 'multiple_choice',
    options: ["A) 60 km", "B) 45 km", "C) 56 km", "D) 72 km"],
    correct_answer: "A) 60 km",
    difficulty: 6,
    topic_id: 'maths_word_problems',
    hint: "Convert 45 minutes to hours first.",
    explanation: "45 minutes = 3/4 of an hour. Distance = speed × time = 80 × 3/4 = 60 km. Always convert units to match before calculating."
  },
  {
    question: "Choose the word that best completes the analogy: Hot is to Cold as Fast is to ___",
    type: 'multiple_choice',
    options: ["A) Quick", "B) Slow", "C) Speed", "D) Run"],
    correct_answer: "B) Slow",
    difficulty: 5,
    topic_id: 'verbal_analogies',
    hint: "Think about the relationship between the first pair.",
    explanation: "Hot and Cold are antonyms (opposites). Following the same pattern, Fast and Slow are antonyms. The relationship is: word → its opposite."
  },
  {
    question: "What is 15% of 240?",
    type: 'numeric',
    options: null,
    correct_answer: "36",
    difficulty: 6,
    topic_id: 'maths_percentages',
    hint: "Find 10% first, then 5%.",
    explanation: "10% of 240 = 24. 5% of 240 = 12. So 15% = 24 + 12 = 36. Breaking percentages into 10% and 5% chunks is a great mental maths strategy."
  },
  {
    question: "Which word is the odd one out? Oak, Maple, Daisy, Elm, Birch",
    type: 'multiple_choice',
    options: ["A) Oak", "B) Maple", "C) Daisy", "D) Elm"],
    correct_answer: "C) Daisy",
    difficulty: 5,
    topic_id: 'verbal_odd_one_out',
    hint: "Think about what category most of the words belong to.",
    explanation: "Oak, Maple, Elm, and Birch are all deciduous trees. Daisy is a flower — it doesn't belong to the tree category, making it the odd one out."
  },
]

export function getFallbackQuestion(topicId?: string): Question {
  if (topicId) {
    const topicMatch = FALLBACK_QUESTIONS.find(q => q.topic_id === topicId)
    if (topicMatch) return topicMatch
  }
  return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)]
}
