import type { Question } from '../types'
import { getTopicById } from './curriculum'
import { questionSignature } from './questionDedup'

/**
 * Offline question bank. Only used when the Anthropic API is unreachable.
 *
 * This bank exists so a session degrades gracefully rather than repeating —
 * every entry is distinct, and selection is exclusion-aware (see
 * getFallbackQuestion). Difficulty is held at 5–9 to match Aarav's floor.
 */
export const FALLBACK_QUESTIONS: Question[] = [
  // ── Maths: Fractions & Decimals ────────────────────────────────────────────
  {
    question: "What is 3/4 + 1/3?",
    type: 'multiple_choice',
    options: ["A) 1 1/12", "B) 4/7", "C) 1 1/4", "D) 2/3"],
    correct_answer: "A) 1 1/12",
    difficulty: 6,
    topic_id: 'maths_fractions',
    hint: "Find a common denominator first.",
    explanation: "Using the common denominator 12: 9/12 + 4/12 = 13/12 = 1 1/12. Always convert to equivalent fractions before adding."
  },
  {
    question: "Which of these is the largest value: 0.6, 5/8, 0.58, or 3/5?",
    type: 'multiple_choice',
    options: ["A) 0.6", "B) 5/8", "C) 0.58", "D) 3/5"],
    correct_answer: "B) 5/8",
    difficulty: 6,
    topic_id: 'maths_fractions',
    hint: "Convert every value to a decimal before comparing.",
    explanation: "5/8 = 0.625, while 0.6 and 3/5 both equal 0.6, and 0.58 is smallest. So 5/8 is largest. Converting everything to one form is the fastest way to compare mixed fractions and decimals."
  },
  {
    question: "What is 2/5 of 3/4?",
    type: 'short_answer',
    options: null,
    correct_answer: "3/10",
    difficulty: 6,
    topic_id: 'maths_fractions',
    hint: "'Of' means multiply.",
    explanation: "2/5 × 3/4 = 6/20, which simplifies to 3/10. Multiply numerators together and denominators together, then simplify."
  },
  {
    question: "What is 7/8 − 2/3?",
    type: 'short_answer',
    options: null,
    correct_answer: "5/24",
    difficulty: 7,
    topic_id: 'maths_fractions',
    hint: "The lowest common denominator of 8 and 3 is 24.",
    explanation: "7/8 = 21/24 and 2/3 = 16/24, so 21/24 − 16/24 = 5/24. This cannot be simplified further since 5 and 24 share no common factor."
  },
  {
    question: "A recipe needs 2 1/4 cups of flour. If you make only one third of the recipe, how many cups of flour do you need?",
    type: 'short_answer',
    options: null,
    correct_answer: "3/4",
    difficulty: 7,
    topic_id: 'maths_fractions',
    hint: "Convert the mixed number to an improper fraction first.",
    explanation: "2 1/4 = 9/4. One third of 9/4 is 9/4 × 1/3 = 9/12 = 3/4 of a cup. Converting mixed numbers to improper fractions before multiplying avoids errors."
  },

  // ── Maths: Percentages & Ratios ────────────────────────────────────────────
  {
    question: "What is 15% of 240?",
    type: 'numeric',
    options: null,
    correct_answer: "36",
    difficulty: 6,
    topic_id: 'maths_percentages',
    hint: "Find 10% first, then 5%.",
    explanation: "10% of 240 = 24, and 5% of 240 = 12, so 15% = 24 + 12 = 36. Breaking percentages into 10% and 5% chunks is a great mental maths strategy."
  },
  {
    question: "A jacket costs $80. It is discounted by 25%, and then a further 10% is taken off the sale price. What is the final price?",
    type: 'numeric',
    options: null,
    correct_answer: "54",
    difficulty: 7,
    topic_id: 'maths_percentages',
    hint: "Apply the second discount to the already-reduced price, not the original.",
    explanation: "25% off $80 gives $60. Then 10% off $60 gives $54. Successive discounts never simply add together — 25% then 10% is not the same as 35% off."
  },
  {
    question: "Two friends share $64 in the ratio 3:5. How much does the friend with the larger share receive?",
    type: 'numeric',
    options: null,
    correct_answer: "40",
    difficulty: 6,
    topic_id: 'maths_percentages',
    hint: "First work out what one 'part' is worth.",
    explanation: "The ratio has 3 + 5 = 8 parts, so one part is $64 ÷ 8 = $8. The larger share is 5 × $8 = $40. Always find the value of a single part before splitting a ratio."
  },
  {
    question: "The price of a book rises from $50 to $65. What is the percentage increase?",
    type: 'numeric',
    options: null,
    correct_answer: "30",
    difficulty: 7,
    topic_id: 'maths_percentages',
    hint: "Percentage change is measured against the original amount.",
    explanation: "The increase is $15. As a fraction of the original: 15/50 = 0.3 = 30%. The denominator is always the starting value, not the new one."
  },
  {
    question: "If 40% of a number is 26, what is the number?",
    type: 'numeric',
    options: null,
    correct_answer: "65",
    difficulty: 7,
    topic_id: 'maths_percentages',
    hint: "Work out what 10% is first.",
    explanation: "If 40% = 26, then 10% = 6.5, so 100% = 65. Working back through 10% is quicker than setting up a full equation."
  },

  // ── Maths: Algebra & Patterns ──────────────────────────────────────────────
  {
    question: "If 3x + 7 = 25, what is the value of x?",
    type: 'numeric',
    options: null,
    correct_answer: "6",
    difficulty: 6,
    topic_id: 'maths_algebra',
    hint: "Undo the addition before the multiplication.",
    explanation: "Subtract 7 from both sides: 3x = 18. Then divide both sides by 3: x = 6. Always reverse the operations in the opposite order they were applied."
  },
  {
    question: "What is the next number in the sequence: 2, 6, 12, 20, 30, ...?",
    type: 'numeric',
    options: null,
    correct_answer: "42",
    difficulty: 7,
    topic_id: 'maths_algebra',
    hint: "Look at the gaps between consecutive terms.",
    explanation: "The differences are 4, 6, 8, 10 — increasing by 2 each time. The next difference is 12, so 30 + 12 = 42. When a sequence isn't linear, the differences usually reveal the rule."
  },
  {
    question: "If 5(n − 3) = 40, what is the value of n?",
    type: 'numeric',
    options: null,
    correct_answer: "11",
    difficulty: 7,
    topic_id: 'maths_algebra',
    hint: "Divide both sides by 5 before touching the bracket.",
    explanation: "Dividing both sides by 5 gives n − 3 = 8, so n = 11. Dividing first is cleaner than expanding the bracket here."
  },
  {
    question: "In the rule y = 4x − 3, what value of x gives y = 21?",
    type: 'numeric',
    options: null,
    correct_answer: "6",
    difficulty: 7,
    topic_id: 'maths_algebra',
    hint: "Substitute 21 for y and solve backwards.",
    explanation: "21 = 4x − 3, so 4x = 24 and x = 6. Substituting the known value first turns a rule into a simple equation."
  },

  // ── Maths: Geometry & Measurement ──────────────────────────────────────────
  {
    question: "A rectangle has a perimeter of 36 cm, and its length is twice its width. What is its area in square centimetres?",
    type: 'numeric',
    options: null,
    correct_answer: "72",
    difficulty: 8,
    topic_id: 'maths_geometry',
    hint: "Perimeter = 2 × (length + width).",
    explanation: "Length + width = 18. With length = 2 × width, we get 3w = 18, so w = 6 and length = 12. Area = 12 × 6 = 72 cm². Reduce two unknowns to one by substituting the relationship."
  },
  {
    question: "The three angles of a triangle are in the ratio 3:4:5. What is the size of the largest angle in degrees?",
    type: 'numeric',
    options: null,
    correct_answer: "75",
    difficulty: 7,
    topic_id: 'maths_geometry',
    hint: "The angles of a triangle always sum to 180°.",
    explanation: "The ratio has 3 + 4 + 5 = 12 parts, so one part is 180 ÷ 12 = 15°. The largest angle is 5 × 15 = 75°. Ratio problems always start by finding the value of one part."
  },
  {
    question: "A cube has a volume of 125 cm³. What is its total surface area in square centimetres?",
    type: 'numeric',
    options: null,
    correct_answer: "150",
    difficulty: 8,
    topic_id: 'maths_geometry',
    hint: "Find the side length first — what number cubed gives 125?",
    explanation: "Since 5³ = 125, each side is 5 cm. A cube has 6 faces, each 5 × 5 = 25 cm², so the surface area is 6 × 25 = 150 cm². Volume gives you the side; the side gives you everything else."
  },
  {
    question: "A square has an area of 49 m². What is its perimeter in metres?",
    type: 'numeric',
    options: null,
    correct_answer: "28",
    difficulty: 5,
    topic_id: 'maths_geometry',
    hint: "The side length is the square root of the area.",
    explanation: "√49 = 7, so each side is 7 m and the perimeter is 4 × 7 = 28 m. For squares, area and perimeter are both determined by the single side length."
  },

  // ── Maths: Data & Probability ──────────────────────────────────────────────
  {
    question: "A bag contains 4 red, 6 blue and 5 green marbles. If one marble is drawn at random, what is the probability that it is NOT blue?",
    type: 'multiple_choice',
    options: ["A) 6/15", "B) 3/5", "C) 2/5", "D) 9/10"],
    correct_answer: "B) 3/5",
    difficulty: 6,
    topic_id: 'maths_data',
    hint: "Count the marbles that are not blue, over the total.",
    explanation: "There are 15 marbles in total and 9 are not blue, so the probability is 9/15 = 3/5. For 'not' questions, it is often quicker to count the favourable outcomes directly."
  },
  {
    question: "The mean of five numbers is 12. When one number is removed, the mean of the remaining four is 11. What was the number that was removed?",
    type: 'numeric',
    options: null,
    correct_answer: "16",
    difficulty: 8,
    topic_id: 'maths_data',
    hint: "Turn each mean back into a total.",
    explanation: "Five numbers with mean 12 total 60. Four numbers with mean 11 total 44. The removed number is 60 − 44 = 16. Converting means into totals is the key move in almost every average problem."
  },
  {
    question: "A spinner has 8 equal sections numbered 1 to 8. What is the probability of landing on a prime number?",
    type: 'multiple_choice',
    options: ["A) 1/2", "B) 3/8", "C) 5/8", "D) 1/4"],
    correct_answer: "A) 1/2",
    difficulty: 7,
    topic_id: 'maths_data',
    hint: "Remember that 1 is not a prime number.",
    explanation: "The primes from 1 to 8 are 2, 3, 5 and 7 — four of them, so the probability is 4/8 = 1/2. The classic trap here is counting 1 as prime; it has only one factor, so it isn't."
  },

  // ── Maths: Word Problems & Logic ───────────────────────────────────────────
  {
    question: "If a train travels at 80 km/h, how far does it travel in 45 minutes?",
    type: 'multiple_choice',
    options: ["A) 60 km", "B) 45 km", "C) 56 km", "D) 72 km"],
    correct_answer: "A) 60 km",
    difficulty: 6,
    topic_id: 'maths_word_problems',
    hint: "Convert 45 minutes to hours first.",
    explanation: "45 minutes = 3/4 of an hour, so distance = 80 × 3/4 = 60 km. Always convert units to match before calculating."
  },
  {
    question: "Three friends share $180. Anna receives twice as much as Ben, and Cara receives $20 more than Ben. How much does Anna receive?",
    type: 'numeric',
    options: null,
    correct_answer: "80",
    difficulty: 8,
    topic_id: 'maths_word_problems',
    hint: "Let Ben's share be x and write everyone else in terms of x.",
    explanation: "If Ben has x, Anna has 2x and Cara has x + 20, so 4x + 20 = 180, giving x = 40. Anna receives 2 × 40 = $80. Naming the smallest share as your variable keeps the algebra tidy."
  },
  {
    question: "A tank fills in 6 hours using tap A alone, or 12 hours using tap B alone. How many hours does it take with both taps running together?",
    type: 'numeric',
    options: null,
    correct_answer: "4",
    difficulty: 8,
    topic_id: 'maths_word_problems',
    hint: "Think about how much of the tank each tap fills in one hour.",
    explanation: "In one hour tap A fills 1/6 and tap B fills 1/12, so together they fill 1/6 + 1/12 = 3/12 = 1/4 of the tank per hour. That means 4 hours in total. Rate problems are solved by adding the per-hour fractions, never the times."
  },
  {
    question: "Pencils cost $2 each and pens cost $5 each. Someone buys 12 items in total and spends $39. How many pens did they buy?",
    type: 'numeric',
    options: null,
    correct_answer: "5",
    difficulty: 8,
    topic_id: 'maths_word_problems',
    hint: "If there are n pens, there must be 12 − n pencils.",
    explanation: "5n + 2(12 − n) = 39 gives 3n + 24 = 39, so n = 5 pens. Expressing both quantities using a single variable turns a two-unknown problem into a one-step equation."
  },

  // ── Maths: Number Sense ────────────────────────────────────────────────────
  {
    question: "What is the value of (2⁵ × 2³) ÷ 2⁴?",
    type: 'numeric',
    options: null,
    correct_answer: "16",
    difficulty: 7,
    topic_id: 'maths_number_sense',
    hint: "Add the indices when multiplying, subtract when dividing.",
    explanation: "2⁵ × 2³ = 2⁸, and 2⁸ ÷ 2⁴ = 2⁴ = 16. Working with the indices is far faster than calculating each power separately."
  },
  {
    question: "What is the sum of all the whole numbers from 1 to 20 inclusive?",
    type: 'numeric',
    options: null,
    correct_answer: "210",
    difficulty: 7,
    topic_id: 'maths_number_sense',
    hint: "Pair the first number with the last, the second with the second-last, and so on.",
    explanation: "Pairing gives 1 + 20 = 21, 2 + 19 = 21, and so on — ten pairs of 21, making 210. The general shortcut is n × (n + 1) ÷ 2."
  },
  {
    question: "What is the lowest common multiple of 12 and 18?",
    type: 'numeric',
    options: null,
    correct_answer: "36",
    difficulty: 6,
    topic_id: 'maths_number_sense',
    hint: "List the multiples of the larger number and check each against the smaller.",
    explanation: "Multiples of 18 are 18, 36, ... and 36 is the first one also divisible by 12. So the LCM is 36. Starting from the larger number gets you there in fewer steps."
  },

  // ── Maths: Time, Money & Units ─────────────────────────────────────────────
  {
    question: "A film starts at 6:45 pm and runs for 2 hours and 40 minutes. What time does it finish?",
    type: 'short_answer',
    options: null,
    correct_answer: "9:25 pm",
    difficulty: 5,
    topic_id: 'maths_time_money',
    hint: "Add the hours first, then the minutes.",
    explanation: "6:45 pm plus 2 hours is 8:45 pm, plus 40 minutes is 9:25 pm. Adding hours before minutes avoids mistakes when the minutes roll past 60."
  },
  {
    question: "Apples cost $4.40 per kilogram. What is the cost of 2.5 kg?",
    type: 'numeric',
    options: null,
    correct_answer: "11",
    difficulty: 5,
    topic_id: 'maths_time_money',
    hint: "2.5 kg is 2 kg plus half a kilogram.",
    explanation: "2 kg costs $8.80 and 0.5 kg costs $2.20, giving $11.00 in total. Splitting a decimal quantity into whole and half parts makes the mental arithmetic easy."
  },

  // ── Reading: Inference & Deduction ─────────────────────────────────────────
  {
    question: "Read the passage: 'Mira checked her watch for the third time. The platform had emptied ten minutes ago, and the departure board now showed only a blinking dash where her train's time had been. She picked up her suitcase and walked slowly back towards the ticket office.' What can we most reasonably infer?",
    type: 'multiple_choice',
    options: ["A) Mira's train has been cancelled or has already left", "B) Mira is early for her train", "C) Mira has lost her ticket", "D) Mira is meeting someone at the station"],
    correct_answer: "A) Mira's train has been cancelled or has already left",
    difficulty: 7,
    topic_id: 'reading_inference',
    hint: "Focus on what the empty platform and the blank departure board together suggest.",
    explanation: "The emptied platform and the blinking dash replacing her train's time both signal the train is no longer coming, and walking back to the ticket office suggests she needs to rearrange. The passage never states this directly — you deduce it from combined details."
  },
  {
    question: "Read the passage: 'Dad said the recipe was foolproof. Two hours later, the smoke alarm was still ringing, and we ate toast for dinner.' What is the writer's attitude towards Dad's cooking?",
    type: 'multiple_choice',
    options: ["A) Gently mocking", "B) Genuinely admiring", "C) Angry and resentful", "D) Completely indifferent"],
    correct_answer: "A) Gently mocking",
    difficulty: 7,
    topic_id: 'reading_inference',
    hint: "Consider the gap between what Dad promised and what actually happened.",
    explanation: "Placing 'foolproof' against a ringing smoke alarm and a dinner of toast creates irony, and the light tone makes it teasing rather than bitter. Humour built on a contrast between claim and outcome signals gentle mockery."
  },
  {
    question: "Read the passage: 'The library's oldest volumes are kept in a room where the temperature never varies by more than one degree, and visitors must leave bags, pens and drinks outside.' Why are these rules most likely in place?",
    type: 'multiple_choice',
    options: ["A) To protect fragile books from damage", "B) To keep the room quiet for readers", "C) To stop visitors from staying too long", "D) To reduce the library's running costs"],
    correct_answer: "A) To protect fragile books from damage",
    difficulty: 6,
    topic_id: 'reading_inference',
    hint: "What do stable temperature, no pens and no drinks all have in common?",
    explanation: "Constant temperature prevents warping, while banning pens and drinks prevents ink marks and spills — every rule targets a way old books could be damaged. When several details point the same direction, that shared purpose is the inference."
  },

  // ── Reading: Main Idea & Summary ───────────────────────────────────────────
  {
    question: "Read the passage: 'Octopuses can change colour in under a second, squeeze through gaps the size of a coin, and solve puzzles that defeat many mammals. Yet they live only a few years, and most never meet another octopus after birth. Their intelligence evolved along a path entirely separate from our own.' What is the main idea?",
    type: 'multiple_choice',
    options: ["A) Octopus intelligence developed independently of ours and is remarkable despite their short, solitary lives", "B) Octopuses are the most intelligent animals in the ocean", "C) Octopuses use colour change mainly to hide from predators", "D) Short lifespans usually prevent animals from becoming intelligent"],
    correct_answer: "A) Octopus intelligence developed independently of ours and is remarkable despite their short, solitary lives",
    difficulty: 7,
    topic_id: 'reading_main_idea',
    hint: "The last sentence often carries the writer's central point.",
    explanation: "The passage lists impressive abilities, notes the unpromising conditions, then names the key point: this intelligence evolved on a separate path. The main idea must cover the whole passage, not just one striking detail like colour change."
  },
  {
    question: "Read the passage: 'Building a new road through the valley would cut travel time by twenty minutes. It would also cross wetlands that filter the town's drinking water and shelter three threatened bird species. Councils rarely find that such trade-offs have a simple answer.' Which statement best summarises the passage?",
    type: 'multiple_choice',
    options: ["A) A proposed road offers real benefits but carries environmental costs that make the decision difficult", "B) The road should not be built under any circumstances", "C) Travel time is the most important factor in road planning", "D) Wetlands are the only source of the town's drinking water"],
    correct_answer: "A) A proposed road offers real benefits but carries environmental costs that make the decision difficult",
    difficulty: 6,
    topic_id: 'reading_main_idea',
    hint: "A good summary keeps both sides of the argument.",
    explanation: "The passage presents a benefit, then two costs, then explicitly says such trade-offs have no simple answer. Options that pick only one side misrepresent a balanced passage."
  },

  // ── Reading: Vocabulary in Context ─────────────────────────────────────────
  {
    question: "Read the sentence: 'The evidence against the theory was so compelling that even its original author abandoned it.' What does 'compelling' mean here?",
    type: 'multiple_choice',
    options: ["A) Convincing and forceful", "B) Confusing and unclear", "C) Recently discovered", "D) Widely published"],
    correct_answer: "A) Convincing and forceful",
    difficulty: 6,
    topic_id: 'reading_vocabulary',
    hint: "What kind of evidence would make an author give up their own theory?",
    explanation: "Evidence powerful enough to make the theory's own author abandon it must be highly convincing, so 'compelling' means convincing and forceful. The consequence described in the sentence points you to the meaning."
  },
  {
    question: "Read the sentence: 'Her account of the accident was at odds with every other witness statement.' What does 'at odds with' mean here?",
    type: 'multiple_choice',
    options: ["A) In conflict with", "B) In agreement with", "C) Longer than", "D) Written after"],
    correct_answer: "A) In conflict with",
    difficulty: 7,
    topic_id: 'reading_vocabulary',
    hint: "'Odds' here relates to being opposed, not to probability.",
    explanation: "'At odds with' means in conflict or disagreement, so her account contradicted the others. Familiar words can carry unfamiliar meanings inside a phrase — read the whole expression, not the individual word."
  },

  // ── Reading: Author Purpose & Tone ─────────────────────────────────────────
  {
    question: "Read the passage: 'Every year we are told the paperless office is finally arriving. Every year, the photocopier queue grows a little longer.' What is the author's purpose?",
    type: 'multiple_choice',
    options: ["A) To point out wryly that a repeated prediction keeps failing", "B) To explain how photocopiers work", "C) To persuade readers to buy less paper", "D) To describe a typical office layout"],
    correct_answer: "A) To point out wryly that a repeated prediction keeps failing",
    difficulty: 7,
    topic_id: 'reading_author_intent',
    hint: "Notice the repetition of 'every year' in both sentences.",
    explanation: "The parallel structure sets the yearly prediction against the yearly reality, creating a dry, ironic observation that the forecast never comes true. Repetition used for contrast is a strong signal of a wry tone."
  },

  // ── Reading: Text Structure & Features ─────────────────────────────────────
  {
    question: "A article begins by describing a flooded street, then explains the rainfall that caused it, then outlines the drainage upgrades now planned. Which text structure is being used?",
    type: 'multiple_choice',
    options: ["A) Problem, cause and solution", "B) Chronological narrative", "C) Compare and contrast", "D) Alphabetical listing"],
    correct_answer: "A) Problem, cause and solution",
    difficulty: 6,
    topic_id: 'reading_text_structure',
    hint: "Label what each of the three sections is doing.",
    explanation: "The flooded street is the problem, the rainfall is the cause, and the drainage upgrades are the solution — a classic three-part structure. Identifying the job of each section is the fastest way to name a structure."
  },

  // ── Verbal: Word Analogies ─────────────────────────────────────────────────
  {
    question: "Choose the word that best completes the analogy: Hot is to Cold as Fast is to ___",
    type: 'multiple_choice',
    options: ["A) Quick", "B) Slow", "C) Speed", "D) Run"],
    correct_answer: "B) Slow",
    difficulty: 5,
    topic_id: 'verbal_analogies',
    hint: "Think about the relationship between the first pair.",
    explanation: "Hot and Cold are opposites, so the same rule gives Fast and Slow. The relationship here is word to its antonym."
  },
  {
    question: "Complete the analogy: Author is to Novel as Composer is to ___",
    type: 'multiple_choice',
    options: ["A) Symphony", "B) Orchestra", "C) Piano", "D) Audience"],
    correct_answer: "A) Symphony",
    difficulty: 6,
    topic_id: 'verbal_analogies',
    hint: "The relationship is creator to the work they create.",
    explanation: "An author creates a novel, so a composer creates a symphony. An orchestra performs the work and a piano is a tool — neither is the thing created, which is the trap in this question."
  },
  {
    question: "Complete the analogy: Sculptor is to Chisel as Painter is to ___",
    type: 'multiple_choice',
    options: ["A) Brush", "B) Gallery", "C) Portrait", "D) Colour"],
    correct_answer: "A) Brush",
    difficulty: 6,
    topic_id: 'verbal_analogies',
    hint: "The relationship is worker to the tool they use.",
    explanation: "A sculptor works with a chisel, so a painter works with a brush. A portrait is the product and a gallery is the location, so only 'brush' preserves the tool relationship."
  },
  {
    question: "Complete the analogy: Drought is to Water as Famine is to ___",
    type: 'multiple_choice',
    options: ["A) Food", "B) Hunger", "C) Farming", "D) Weather"],
    correct_answer: "A) Food",
    difficulty: 7,
    topic_id: 'verbal_analogies',
    hint: "The relationship is a shortage and the thing that is missing.",
    explanation: "A drought is a severe shortage of water, so a famine is a severe shortage of food. 'Hunger' is the result of a famine rather than the thing in short supply, which makes it the tempting wrong answer."
  },

  // ── Verbal: Antonyms & Synonyms ────────────────────────────────────────────
  {
    question: "Which word is most nearly the OPPOSITE of 'abundant'?",
    type: 'multiple_choice',
    options: ["A) Scarce", "B) Plentiful", "C) Heavy", "D) Generous"],
    correct_answer: "A) Scarce",
    difficulty: 6,
    topic_id: 'verbal_antonyms',
    hint: "'Abundant' means existing in large quantities.",
    explanation: "Abundant means present in great quantity, so its opposite is scarce, meaning in short supply. 'Plentiful' is a synonym, included to catch anyone reading the question too quickly."
  },
  {
    question: "Which word is most nearly the OPPOSITE of 'diminish'?",
    type: 'multiple_choice',
    options: ["A) Increase", "B) Reduce", "C) Damage", "D) Conclude"],
    correct_answer: "A) Increase",
    difficulty: 6,
    topic_id: 'verbal_antonyms',
    hint: "'Diminish' means to make or become smaller.",
    explanation: "To diminish is to make smaller, so the opposite is to increase. 'Reduce' means much the same as diminish, so it is a synonym rather than an antonym."
  },
  {
    question: "Which word most nearly means 'meticulous'?",
    type: 'multiple_choice',
    options: ["A) Painstaking", "B) Careless", "C) Hurried", "D) Reluctant"],
    correct_answer: "A) Painstaking",
    difficulty: 7,
    topic_id: 'verbal_antonyms',
    hint: "Think of someone who checks every tiny detail.",
    explanation: "Meticulous describes extreme care over detail, which is exactly what painstaking means. 'Careless' and 'hurried' both describe the opposite quality."
  },

  // ── Verbal: Odd One Out ────────────────────────────────────────────────────
  {
    question: "Which word is the odd one out? Oak, Maple, Daisy, Elm, Birch",
    type: 'multiple_choice',
    options: ["A) Oak", "B) Maple", "C) Daisy", "D) Elm"],
    correct_answer: "C) Daisy",
    difficulty: 5,
    topic_id: 'verbal_odd_one_out',
    hint: "Think about what category most of the words belong to.",
    explanation: "Oak, Maple, Elm and Birch are all trees, while Daisy is a flower. Find the category that covers most of the list, then the exception stands out."
  },
  {
    question: "Which is the odd one out? Copper, Iron, Bronze, Zinc, Nickel",
    type: 'multiple_choice',
    options: ["A) Copper", "B) Bronze", "C) Zinc", "D) Nickel"],
    correct_answer: "B) Bronze",
    difficulty: 7,
    topic_id: 'verbal_odd_one_out',
    hint: "One of these is not a pure substance.",
    explanation: "Copper, Iron, Zinc and Nickel are all chemical elements, whereas Bronze is an alloy made by mixing copper and tin. The grouping rule here is scientific rather than everyday."
  },
  {
    question: "Which is the odd one out? Novel, Poem, Dictionary, Essay, Short story",
    type: 'multiple_choice',
    options: ["A) Novel", "B) Poem", "C) Dictionary", "D) Essay"],
    correct_answer: "C) Dictionary",
    difficulty: 6,
    topic_id: 'verbal_odd_one_out',
    hint: "Which one is consulted rather than read from beginning to end?",
    explanation: "A novel, poem, essay and short story are all composed pieces of writing read as a whole, while a dictionary is a reference work you look things up in. Ask what each item is *for*, not just what it is."
  },

  // ── Verbal: Word Relationships ─────────────────────────────────────────────
  {
    question: "Which pair of words has the same relationship as 'Library : Books'?",
    type: 'multiple_choice',
    options: ["A) Armoury : Weapons", "B) Teacher : School", "C) Reading : Learning", "D) Shelf : Wood"],
    correct_answer: "A) Armoury : Weapons",
    difficulty: 7,
    topic_id: 'verbal_word_relationships',
    hint: "A library is the place where books are stored.",
    explanation: "A library stores books just as an armoury stores weapons — a storage place paired with what it holds. 'Shelf : Wood' is object to material, a different relationship entirely."
  },

  // ── Verbal: Sentence Completion ────────────────────────────────────────────
  {
    question: "Choose the word that best completes the sentence: 'Although the report was ___, the committee still asked for further detail before deciding.'",
    type: 'multiple_choice',
    options: ["A) thorough", "B) careless", "C) missing", "D) brief"],
    correct_answer: "A) thorough",
    difficulty: 7,
    topic_id: 'verbal_sentence_completion',
    hint: "'Although' signals a contrast between the two halves.",
    explanation: "'Although' means the two halves must contrast, so a report good enough to need no more detail — a thorough one — sets up the surprise that more was asked for. If the report were careless or brief, asking for detail would be expected, not contrasting."
  },

  // ── Abstract: Number & Letter Sequences ────────────────────────────────────
  {
    question: "What comes next in the sequence: 3, 7, 15, 31, 63, ...?",
    type: 'numeric',
    options: null,
    correct_answer: "127",
    difficulty: 7,
    topic_id: 'abstract_sequences',
    hint: "Try doubling each term and then adjusting.",
    explanation: "Each term is double the previous one plus 1: 3→7, 7→15, 15→31, 31→63, so next is 63 × 2 + 1 = 127. When differences keep growing, test a multiply-then-add rule."
  },
  {
    question: "What letter comes next in the sequence: B, E, I, N, ...?",
    type: 'short_answer',
    options: null,
    correct_answer: "T",
    difficulty: 8,
    topic_id: 'abstract_sequences',
    hint: "Convert the letters to their positions in the alphabet.",
    explanation: "B, E, I, N are positions 2, 5, 9, 14, with gaps of 3, 4, 5 — so the next gap is 6, giving position 20, which is T. Converting letters to numbers turns a letter puzzle into an ordinary sequence."
  },
  {
    question: "What comes next in the sequence: 2, 3, 5, 8, 13, 21, ...?",
    type: 'numeric',
    options: null,
    correct_answer: "34",
    difficulty: 7,
    topic_id: 'abstract_sequences',
    hint: "Try adding two consecutive terms together.",
    explanation: "Each term is the sum of the two before it: 8 + 13 = 21, so the next is 13 + 21 = 34. This is the Fibonacci rule, and it is worth testing whenever the differences look irregular."
  },
  {
    question: "What comes next in the sequence: 1, 4, 9, 16, 25, ...?",
    type: 'numeric',
    options: null,
    correct_answer: "36",
    difficulty: 5,
    topic_id: 'abstract_sequences',
    hint: "Each term is a number multiplied by itself.",
    explanation: "These are the square numbers 1², 2², 3², 4², 5², so the next is 6² = 36. Recognising squares, cubes and doubling patterns on sight saves valuable time in a test."
  },

  // ── Abstract: Pattern Matrix ───────────────────────────────────────────────
  {
    question: "In a 3×3 grid, each row contains one circle, one square and one triangle, and no shape repeats in any column. Row 1 is circle, square, triangle. Row 2 is triangle, circle, square. What is the first shape in Row 3?",
    type: 'multiple_choice',
    options: ["A) Square", "B) Circle", "C) Triangle", "D) Cannot be determined"],
    correct_answer: "A) Square",
    difficulty: 8,
    topic_id: 'abstract_pattern_matrix',
    hint: "Look down the first column and see which shape is missing.",
    explanation: "Column 1 already contains a circle and a triangle, and no shape may repeat in a column, so the remaining shape is the square. Grid puzzles are solved by elimination along the row and column that intersect the gap."
  },
  {
    question: "A pattern grows like this: Step 1 has 1 dot, Step 2 has 5 dots, Step 3 has 13 dots, Step 4 has 25 dots. How many dots are in Step 5?",
    type: 'numeric',
    options: null,
    correct_answer: "41",
    difficulty: 8,
    topic_id: 'abstract_pattern_matrix',
    hint: "Look at how much is added at each step.",
    explanation: "The amounts added are 4, 8 and 12 — increasing by 4 each time — so the next addition is 16, giving 25 + 16 = 41. When the additions themselves form a pattern, extend that pattern first."
  },

  // ── Abstract: Spatial Reasoning ────────────────────────────────────────────
  {
    question: "A cube is painted red on all six faces and then cut into 27 identical smaller cubes. How many of the small cubes have exactly three red faces?",
    type: 'numeric',
    options: null,
    correct_answer: "8",
    difficulty: 8,
    topic_id: 'abstract_spatial',
    hint: "Think about which positions in the big cube touch three outside faces.",
    explanation: "Only the corner cubes touch three outer faces, and every cube has exactly 8 corners, so the answer is 8. Edge cubes have two painted faces and face-centre cubes have one."
  },
  {
    question: "A square piece of paper is folded exactly in half twice, then a single hole is punched through all the layers. When the paper is unfolded, how many holes are there?",
    type: 'numeric',
    options: null,
    correct_answer: "4",
    difficulty: 7,
    topic_id: 'abstract_spatial',
    hint: "Each fold doubles the number of layers the punch passes through.",
    explanation: "One fold gives 2 layers and a second fold gives 4 layers, so a single punch makes 4 holes. Count the layers, not the folds — that is the whole trick to paper-folding questions."
  },

  // ── Abstract: Odd Shape Out ────────────────────────────────────────────────
  {
    question: "Which shape is the odd one out? A square, a rhombus, a rectangle, a trapezium.",
    type: 'multiple_choice',
    options: ["A) Square", "B) Rhombus", "C) Rectangle", "D) Trapezium"],
    correct_answer: "D) Trapezium",
    difficulty: 7,
    topic_id: 'abstract_odd_shape',
    hint: "Count how many pairs of parallel sides each shape has.",
    explanation: "A square, rhombus and rectangle are all parallelograms with two pairs of parallel sides, while a trapezium has only one pair. Classifying by properties rather than appearance is what these questions test."
  },
  {
    question: "Which is the odd one out? A shape with 3 sides, a shape with 5 sides, a shape with 7 sides, a shape with 8 sides.",
    type: 'multiple_choice',
    options: ["A) 3 sides", "B) 5 sides", "C) 7 sides", "D) 8 sides"],
    correct_answer: "D) 8 sides",
    difficulty: 6,
    topic_id: 'abstract_odd_shape',
    hint: "Look at whether each number of sides is odd or even.",
    explanation: "3, 5 and 7 are all odd numbers, while 8 is even, making the octagon the exception. The grouping rule in abstract questions is often numerical rather than visual."
  },

  // ── Writing ────────────────────────────────────────────────────────────────
  {
    question: "You are planning a persuasive piece arguing that all students should learn a second language. Which of these would be the strongest opening paragraph?",
    type: 'multiple_choice',
    options: ["A) A clear statement of your position followed by a preview of your three main reasons", "B) A full retelling of your own experience learning a language", "C) A list of every country where English is not spoken", "D) A dictionary definition of the word 'language'"],
    correct_answer: "A) A clear statement of your position followed by a preview of your three main reasons",
    difficulty: 6,
    topic_id: 'writing_planning',
    hint: "A marker should know your argument and its shape after the first paragraph.",
    explanation: "Stating your position and previewing your reasons tells the reader exactly where the piece is going and gives it a clear structure to follow. Definitions and long personal anecdotes delay the argument instead of launching it."
  },
  {
    question: "Which sentence uses the most persuasive technique of appealing to the reader directly?",
    type: 'multiple_choice',
    options: ["A) Ask yourself how you would feel if the park you grew up with disappeared.", "B) The park covers approximately four hectares.", "C) Parks were first built in cities during the 1800s.", "D) Some people like parks and some do not."],
    correct_answer: "A) Ask yourself how you would feel if the park you grew up with disappeared.",
    difficulty: 6,
    topic_id: 'writing_persuasive',
    hint: "Look for the sentence that speaks to 'you'.",
    explanation: "Addressing the reader as 'you' and asking them to imagine a personal loss creates emotional involvement, which is the core of direct appeal. The other options give neutral facts that inform without persuading."
  },
  {
    question: "In a narrative, which technique best shows a character is nervous without stating it directly?",
    type: 'multiple_choice',
    options: ["A) Describing her reading the same line of the notice three times without taking it in", "B) Writing 'She was very nervous.'", "C) Explaining that nervousness is a common human emotion", "D) Listing the events of her day in order"],
    correct_answer: "A) Describing her reading the same line of the notice three times without taking it in",
    difficulty: 7,
    topic_id: 'writing_narrative',
    hint: "Think about the difference between showing and telling.",
    explanation: "Re-reading the same line without absorbing it lets the reader deduce her state of mind from behaviour, which is the 'show, don't tell' principle. Simply stating she was nervous tells the reader instead of letting them infer."
  },
]

/**
 * Picks an offline question, never repeating one the session has already seen.
 *
 * Widens the search deliberately: the requested topic first, then any topic in
 * the same domain, then the whole bank. Returns null when the bank is exhausted
 * — callers must surface that rather than serve a repeat.
 */
export function getFallbackQuestion(
  topicId?: string,
  usedSignatures?: ReadonlySet<string>,
): Question | null {
  const used = usedSignatures ?? new Set<string>()
  const unused = FALLBACK_QUESTIONS.filter(q => !used.has(questionSignature(q)))
  if (unused.length === 0) return null

  const pick = (pool: Question[]) =>
    pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null

  if (topicId) {
    const sameTopic = pick(unused.filter(q => q.topic_id === topicId))
    if (sameTopic) return sameTopic

    const domain = getTopicById(topicId)?.domain
    if (domain) {
      const sameDomain = pick(
        unused.filter(q => getTopicById(q.topic_id)?.domain === domain),
      )
      if (sameDomain) return sameDomain
    }
  }

  return pick(unused)
}
