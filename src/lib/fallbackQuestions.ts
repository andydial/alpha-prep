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

  // ── Numerical Reasoning: Number & Letter Sequences ────────────────────────
  {
    question: "What number comes next in this series: 2, 6, 12, 20, 30, ?",
    type: 'multiple_choice',
    options: ["A) 36", "B) 40", "C) 42", "D) 44"],
    correct_answer: "C) 42",
    difficulty: 6,
    topic_id: 'abstract_sequences',
    hint: "Write the gaps between the terms underneath and look at those.",
    explanation: "The gaps are 4, 6, 8, 10 — each one two larger than the last — so the next gap is 12 and the next term is 30 + 12 = 42. When a series has no constant difference, the differences themselves are usually the pattern."
  },
  {
    question: "What letter comes next in this series: B, D, G, K, P, ?",
    type: 'multiple_choice',
    options: ["A) T", "B) U", "C) V", "D) W"],
    correct_answer: "C) V",
    difficulty: 7,
    topic_id: 'abstract_sequences',
    hint: "Count how many letters you skip between each pair.",
    explanation: "The steps are +2, +3, +4, +5, so the next step is +6. P is the 16th letter, and 16 + 6 = 22, which is V. Converting letters to their positions turns a letter series into an ordinary number series."
  },
  {
    question: "Find the missing number: 3, 7, 15, 31, ?, 127",
    type: 'multiple_choice',
    options: ["A) 62", "B) 63", "C) 64", "D) 79"],
    correct_answer: "B) 63",
    difficulty: 7,
    topic_id: 'abstract_sequences',
    hint: "Try doubling each term and doing one more thing to it.",
    explanation: "Each term is double the previous one plus 1: 3 to 7, 7 to 15, 15 to 31, so 31 x 2 + 1 = 63, and 63 x 2 + 1 = 127 confirms the rule. Always check your rule against a later term you were given."
  },

  // ── Numerical Reasoning: Number Matrices & Grids ──────────────────────────
  {
    question: "In each row the same rule turns the first two numbers into the third. Row 1: 8, 3 -> 5. Row 2: 12, 7 -> 5. Row 3: 15, 6 -> ?",
    type: 'multiple_choice',
    options: ["A) 7", "B) 8", "C) 9", "D) 21"],
    correct_answer: "C) 9",
    difficulty: 5,
    topic_id: 'abstract_pattern_matrix',
    hint: "Both given rows produce the same answer — what single operation does that?",
    explanation: "The rule is first minus second: 8 - 3 = 5 and 12 - 7 = 5, so 15 - 6 = 9. Test a candidate rule against every row you are given before you use it."
  },
  {
    question: "In each row the same rule turns the first two numbers into the third. Row 1: 4, 5 -> 20. Row 2: 6, 3 -> 18. Row 3: 7, 8 -> ?",
    type: 'multiple_choice',
    options: ["A) 15", "B) 48", "C) 54", "D) 56"],
    correct_answer: "D) 56",
    difficulty: 5,
    topic_id: 'abstract_pattern_matrix',
    hint: "The results are much larger than the inputs.",
    explanation: "The rule is simply first x second: 4 x 5 = 20 and 6 x 3 = 18, so 7 x 8 = 56. When the output is far larger than either input, multiplication is the first rule to try."
  },
  {
    question: "In each row the same rule turns the first two numbers into the third. Row 1: 9, 4 -> 26. Row 2: 7, 3 -> 20. Row 3: 6, 5 -> ?",
    type: 'multiple_choice',
    options: ["A) 11", "B) 21", "C) 22", "D) 30"],
    correct_answer: "C) 22",
    difficulty: 7,
    topic_id: 'abstract_pattern_matrix',
    hint: "Add the two numbers first, then see what happens to the total.",
    explanation: "In row 1, 9 + 4 = 13 and 13 x 2 = 26; in row 2, 7 + 3 = 10 and 10 x 2 = 20. So row 3 gives 6 + 5 = 11 and 11 x 2 = 22. Combining the inputs before operating is a common two-stage matrix rule."
  },

  // ── Numerical Reasoning: Arithmetic Reasoning & Worded Logic ──────────────
  {
    question: "Maya is 3 times as old as her brother. In 4 years she will be twice as old as he is then. How old is Maya now?",
    type: 'multiple_choice',
    options: ["A) 6", "B) 9", "C) 12", "D) 15"],
    correct_answer: "C) 12",
    difficulty: 7,
    topic_id: 'numerical_arithmetic',
    hint: "Call the brother's age b and write both sentences as equations.",
    explanation: "If the brother is b, Maya is 3b, and in 4 years 3b + 4 = 2(b + 4), which gives b = 4 and Maya = 12. Checking: now 12 and 4, in four years 16 and 8, which is exactly twice."
  },
  {
    question: "Three friends share $84 so that each one gets twice as much as the next. How much does the friend with the smallest share receive?",
    type: 'multiple_choice',
    options: ["A) $12", "B) $14", "C) $21", "D) $24"],
    correct_answer: "A) $12",
    difficulty: 6,
    topic_id: 'numerical_arithmetic',
    hint: "Call the smallest share one part and write the other two in parts as well.",
    explanation: "The shares are 1 part, 2 parts and 4 parts, which is 7 parts altogether, so one part is 84 divided by 7 = $12. Turning a doubling relationship into equal parts is the fastest route through these."
  },
  {
    question: "The average of five numbers is 14. Four of them are 10, 12, 16 and 18. What is the fifth number?",
    type: 'multiple_choice',
    options: ["A) 12", "B) 14", "C) 16", "D) 20"],
    correct_answer: "B) 14",
    difficulty: 6,
    topic_id: 'numerical_arithmetic',
    hint: "An average of 14 across five numbers tells you the total.",
    explanation: "Five numbers averaging 14 have a total of 70, and the four given numbers add to 56, so the fifth is 70 - 56 = 14. Convert an average into a total before you do anything else."
  },
  {
    question: "One tap fills a tank in 12 minutes and another fills the same tank in 24 minutes. Working together, how long do they take to fill it?",
    type: 'multiple_choice',
    options: ["A) 6 minutes", "B) 8 minutes", "C) 18 minutes", "D) 36 minutes"],
    correct_answer: "B) 8 minutes",
    difficulty: 8,
    topic_id: 'numerical_arithmetic',
    hint: "Think about how much of the tank each tap fills in one minute.",
    explanation: "In one minute the taps fill 1/12 and 1/24 of the tank, which together is 3/24 = 1/8 of the tank, so the whole tank takes 8 minutes. Working in 'amount per minute' turns every combined-rate question into a simple addition."
  },
  {
    question: "A number is doubled and then 7 is subtracted, giving 33. What was the original number?",
    type: 'multiple_choice',
    options: ["A) 13", "B) 20", "C) 26", "D) 40"],
    correct_answer: "B) 20",
    difficulty: 5,
    topic_id: 'numerical_arithmetic',
    hint: "Undo the steps in the reverse order to the one given.",
    explanation: "Working backwards, add 7 to get 40, then halve it to get 20. Checking forwards: 20 doubled is 40, minus 7 is 33. Reversing the operations in reverse order is the reliable method here."
  },

  // ── Numerical Reasoning: Number Properties & Relationships ────────────────
  {
    question: "What is the smallest whole number greater than 1 that leaves a remainder of 1 when it is divided by 2, by 3 and by 4?",
    type: 'multiple_choice',
    options: ["A) 7", "B) 11", "C) 13", "D) 25"],
    correct_answer: "C) 13",
    difficulty: 7,
    topic_id: 'numerical_properties',
    hint: "First find the smallest number that divides exactly by 2, 3 and 4.",
    explanation: "The lowest common multiple of 2, 3 and 4 is 12, so 12 + 1 = 13 leaves a remainder of 1 in every case. A 'remainder of 1 every time' question is always the lowest common multiple plus one."
  },
  {
    question: "How many different whole numbers divide exactly into 36?",
    type: 'multiple_choice',
    options: ["A) 6", "B) 8", "C) 9", "D) 10"],
    correct_answer: "C) 9",
    difficulty: 6,
    topic_id: 'numerical_properties',
    hint: "List them in pairs that multiply to 36 and watch for the pair that repeats.",
    explanation: "The factors pair up as 1x36, 2x18, 3x12, 4x9 and 6x6, giving 1, 2, 3, 4, 6, 9, 12, 18 and 36 — nine in all. Square numbers always have an odd number of factors because one pair is a repeat."
  },
  {
    question: "Which of these numbers is prime?",
    type: 'multiple_choice',
    options: ["A) 51", "B) 57", "C) 59", "D) 91"],
    correct_answer: "C) 59",
    difficulty: 7,
    topic_id: 'numerical_properties',
    hint: "Test each one against 3 and 7 before deciding.",
    explanation: "51 = 3 x 17, 57 = 3 x 19 and 91 = 7 x 13, while 59 has no factor other than 1 and itself. Checking the digit sum for divisibility by 3 rules out two of these instantly."
  },
  {
    question: "What is the largest whole number that divides exactly into both 84 and 126?",
    type: 'multiple_choice',
    options: ["A) 14", "B) 21", "C) 28", "D) 42"],
    correct_answer: "D) 42",
    difficulty: 7,
    topic_id: 'numerical_properties',
    hint: "Break both numbers into their prime factors and keep what they share.",
    explanation: "84 = 2 x 2 x 3 x 7 and 126 = 2 x 3 x 3 x 7, and the shared factors are 2, 3 and 7, giving 2 x 3 x 7 = 42. Prime factorisation is the safest way to find a highest common factor under time pressure."
  },
  {
    question: "The product of two consecutive whole numbers is 132. What is the smaller of the two numbers?",
    type: 'multiple_choice',
    options: ["A) 10", "B) 11", "C) 12", "D) 66"],
    correct_answer: "B) 11",
    difficulty: 6,
    topic_id: 'numerical_properties',
    hint: "Which number multiplied by itself is close to 132?",
    explanation: "11 x 12 = 132, so the smaller number is 11. Since 11 x 11 = 121 and 12 x 12 = 144, the answer had to sit between 11 and 12 — estimating with the square root narrows it immediately."
  },

  // ── Numerical Reasoning: Rates, Ratio & Proportion ────────────────────────
  {
    question: "If 4 machines make 240 parts in an hour, how many parts do 7 machines make in an hour at the same rate?",
    type: 'multiple_choice',
    options: ["A) 380", "B) 400", "C) 420", "D) 480"],
    correct_answer: "C) 420",
    difficulty: 6,
    topic_id: 'numerical_proportion',
    hint: "Work out what a single machine produces first.",
    explanation: "One machine makes 240 divided by 4 = 60 parts an hour, so 7 machines make 7 x 60 = 420. Reducing to one unit before scaling up is the standard method and it almost never goes wrong."
  },
  {
    question: "A recipe for 6 people needs 450 g of rice. How much rice is needed for 10 people?",
    type: 'multiple_choice',
    options: ["A) 675 g", "B) 700 g", "C) 750 g", "D) 810 g"],
    correct_answer: "C) 750 g",
    difficulty: 5,
    topic_id: 'numerical_proportion',
    hint: "How much rice does one person need?",
    explanation: "450 divided by 6 is 75 g per person, so 10 people need 750 g. Notice that 10 is not a whole multiple of 6, which is exactly why finding the per-person amount is worth the extra step."
  },
  {
    question: "A car travels 165 km in 2 hours. At the same speed, how far does it travel in 5 hours?",
    type: 'multiple_choice',
    options: ["A) 330 km", "B) 412.5 km", "C) 425 km", "D) 400 km"],
    correct_answer: "B) 412.5 km",
    difficulty: 6,
    topic_id: 'numerical_proportion',
    hint: "Find the distance for one hour, even if it is not a whole number.",
    explanation: "The speed is 165 divided by 2 = 82.5 km/h, so in 5 hours the car covers 82.5 x 5 = 412.5 km. Do not round the intermediate speed — half a kilometre per hour becomes 2.5 km over five hours."
  },
  {
    question: "In a box the ratio of red counters to blue counters is 5 : 3. There are 96 counters altogether. How many are red?",
    type: 'multiple_choice',
    options: ["A) 36", "B) 50", "C) 60", "D) 64"],
    correct_answer: "C) 60",
    difficulty: 6,
    topic_id: 'numerical_proportion',
    hint: "How many equal parts is the box divided into?",
    explanation: "The ratio has 5 + 3 = 8 parts, so one part is 96 divided by 8 = 12, and the red counters are 5 x 12 = 60. Always total the parts of a ratio before dividing."
  },
  {
    question: "Six workers build a wall in 10 days. Working at the same rate, how long would 4 workers take to build the same wall?",
    type: 'multiple_choice',
    options: ["A) 6 days", "B) 12 days", "C) 15 days", "D) 20 days"],
    correct_answer: "C) 15 days",
    difficulty: 7,
    topic_id: 'numerical_proportion',
    hint: "Work out the total amount of work in 'worker-days' first.",
    explanation: "The wall takes 6 x 10 = 60 worker-days, so 4 workers need 60 divided by 4 = 15 days. Fewer workers means more days, so this is inverse proportion — if your answer went down instead of up, you have divided the wrong way."
  },

  // ── Verbal Reasoning: Logical Deduction ───────────────────────────────────
  {
    question: "All members of the school choir can read music. Priya can read music. Which statement must be true?",
    type: 'multiple_choice',
    options: [
      "A) Priya is a member of the choir.",
      "B) Priya may or may not be a member of the choir.",
      "C) Priya is not a member of the choir.",
      "D) Everyone who can read music is in the choir."
    ],
    correct_answer: "B) Priya may or may not be a member of the choir.",
    difficulty: 7,
    topic_id: 'verbal_logical_deduction',
    hint: "The statement runs one way only — check whether it also runs backwards.",
    explanation: "We are told every choir member can read music, not that every music reader is in the choir, so Priya's ability tells us nothing about her membership. Reversing a one-way statement is the trap these questions are built around."
  },
  {
    question: "Tom is taller than Sara. Sara is taller than Leo. Mia is shorter than Leo. Who is the shortest?",
    type: 'multiple_choice',
    options: ["A) Tom", "B) Sara", "C) Leo", "D) Mia"],
    correct_answer: "D) Mia",
    difficulty: 5,
    topic_id: 'verbal_logical_deduction',
    hint: "Write the names in a single line from tallest to shortest.",
    explanation: "The order is Tom, Sara, Leo, Mia, so Mia is the shortest. Building one ordered list from the clues is faster and safer than holding the comparisons in your head."
  },
  {
    question: "No reptiles are warm-blooded. All snakes are reptiles. Which conclusion must be true?",
    type: 'multiple_choice',
    options: [
      "A) No snakes are warm-blooded.",
      "B) Some snakes are warm-blooded.",
      "C) All warm-blooded animals are snakes.",
      "D) Some reptiles are not snakes."
    ],
    correct_answer: "A) No snakes are warm-blooded.",
    difficulty: 6,
    topic_id: 'verbal_logical_deduction',
    hint: "If snakes sit inside the group of reptiles, what applies to all reptiles applies to them.",
    explanation: "Snakes are a subset of reptiles, and nothing in the reptile group is warm-blooded, so no snake can be. Option D might well be true in reality, but it does not follow from the two statements given, and only what follows counts."
  },

  // ── Verbal Reasoning: Letter & Word Codes ─────────────────────────────────
  {
    question: "In a certain code CAT is written as DBU. How is DOG written in the same code?",
    type: 'multiple_choice',
    options: ["A) CNF", "B) DPH", "C) EPG", "D) EPH"],
    correct_answer: "D) EPH",
    difficulty: 5,
    topic_id: 'verbal_codes',
    hint: "Compare each letter of CAT with the matching letter of DBU.",
    explanation: "Each letter moves forward one place in the alphabet, so D becomes E, O becomes P and G becomes H, giving EPH. Always check every letter of the example, not just the first."
  },
  {
    question: "If FLOWER is written as REWOLF, how is GARDEN written in the same code?",
    type: 'multiple_choice',
    options: ["A) NADREG", "B) NEDARG", "C) NEDRAG", "D) GNEDRA"],
    correct_answer: "C) NEDRAG",
    difficulty: 5,
    topic_id: 'verbal_codes',
    hint: "Read the coded word backwards.",
    explanation: "The code simply reverses the letters, and GARDEN reversed is NEDRAG. Writing the word out backwards letter by letter is safer than trying to reverse it in your head."
  },
  {
    question: "In a certain language 'blue sky' is written as 'ka tor' and 'blue sea' is written as 'ka mel'. What does 'ka' mean?",
    type: 'multiple_choice',
    options: ["A) sky", "B) sea", "C) blue", "D) the"],
    correct_answer: "C) blue",
    difficulty: 6,
    topic_id: 'verbal_codes',
    hint: "Which English word appears in both phrases, and which code word appears in both?",
    explanation: "'Blue' is the only English word in both phrases and 'ka' is the only code word in both, so 'ka' must mean blue. Matching what the phrases have in common is the whole technique for substitution codes."
  },

  // ── Verbal Reasoning: extra word relationships, completion and antonyms ───
  {
    question: "Which word belongs with this group: violin, cello, viola?",
    type: 'multiple_choice',
    options: ["A) trumpet", "B) double bass", "C) flute", "D) drum"],
    correct_answer: "B) double bass",
    difficulty: 6,
    topic_id: 'verbal_word_relationships',
    hint: "How is the sound produced on all three of the given instruments?",
    explanation: "A violin, cello and viola are all bowed string instruments, and so is the double bass, while the trumpet and flute are wind instruments and the drum is percussion. Group by how something works, not by where you usually see it."
  },
  {
    question: "Which pair of words has the same relationship as SHOAL is to FISH?",
    type: 'multiple_choice',
    options: ["A) pride : lions", "B) herd : sheep", "C) swarm : trees", "D) pack : birds"],
    correct_answer: "A) pride : lions",
    difficulty: 7,
    topic_id: 'verbal_word_relationships',
    hint: "A shoal is the correct collective noun for fish — which option uses the correct one?",
    explanation: "A shoal of fish matches a pride of lions, because both are the proper collective noun for that animal. Sheep come in flocks, trees do not swarm, and birds come in flocks rather than packs."
  },
  {
    question: "Choose the word that best completes the sentence: The evidence was so ______ that the jury reached its verdict within minutes.",
    type: 'multiple_choice',
    options: ["A) ambiguous", "B) tentative", "C) compelling", "D) trivial"],
    correct_answer: "C) compelling",
    difficulty: 6,
    topic_id: 'verbal_sentence_completion',
    hint: "The speed of the verdict tells you how strong the evidence was.",
    explanation: "A verdict reached within minutes means the evidence was overwhelming, which is what 'compelling' describes. Ambiguous and tentative evidence would slow a jury down, and trivial evidence would not decide anything."
  },
  {
    question: "Choose the word that best completes the sentence: Although the path looked ______, it turned out to be the quickest way to the summit.",
    type: 'multiple_choice',
    options: ["A) direct", "B) circuitous", "C) level", "D) brief"],
    correct_answer: "B) circuitous",
    difficulty: 7,
    topic_id: 'verbal_sentence_completion',
    hint: "The word 'although' signals a contrast with 'quickest'.",
    explanation: "'Although' sets up a contrast, so the path must have looked slow — 'circuitous' means roundabout and winding. The other three would agree with 'quickest' rather than contrast with it."
  },
  {
    question: "Which word is most nearly opposite in meaning to SCARCE?",
    type: 'multiple_choice',
    options: ["A) limited", "B) hidden", "C) rare", "D) abundant"],
    correct_answer: "D) abundant",
    difficulty: 5,
    topic_id: 'verbal_antonyms',
    hint: "Scarce means there is very little of something.",
    explanation: "Scarce means in short supply, so its opposite is 'abundant', meaning plentiful. 'Limited' and 'rare' are near-synonyms of scarce, which is exactly why they are offered."
  },
  {
    question: "DROUGHT is to RAIN as FAMINE is to:",
    type: 'multiple_choice',
    options: ["A) hunger", "B) food", "C) war", "D) desert"],
    correct_answer: "B) food",
    difficulty: 7,
    topic_id: 'verbal_analogies',
    hint: "State the first relationship as a sentence before looking at the options.",
    explanation: "A drought is a severe shortage of rain, so a famine is a severe shortage of food. 'Hunger' is the result of a famine rather than the thing in short supply, which makes it the tempting wrong answer."
  },

  // ── Reading Comprehension: informational passage (mallee fowl) ────────────
  {
    question: "What is the main idea of this passage?",
    type: 'multiple_choice',
    options: [
      "A) Rotting leaves give off a surprising amount of heat.",
      "B) The mallee fowl incubates its eggs in a heated mound instead of sitting on them.",
      "C) Mallee fowl chicks are stronger than the chicks of other birds.",
      "D) The male mallee fowl is a careless parent."
    ],
    correct_answer: "B) The mallee fowl incubates its eggs in a heated mound instead of sitting on them.",
    difficulty: 5,
    topic_id: 'reading_main_idea',
    passage: "The mallee fowl is one of the few birds that never sits on its eggs. Instead, the male spends up to eleven months of the year tending an enormous mound of sand and rotting leaves. As the leaves break down they release heat, and the male tests the temperature of the mound by pushing his beak deep into it. If the mound grows too warm he scrapes sand away; if it cools he piles more on. The chicks hatch underground and dig their way to the surface alone, receiving no help and no food from either parent.",
    hint: "Ask what the passage is about as a whole, not what one sentence says.",
    explanation: "Every part of the passage - the mound, the temperature testing, the chicks digging out - supports the single idea that this bird incubates without sitting on its eggs. The other options are details from the passage or claims it never makes."
  },
  {
    question: "What does the passage suggest about the male mallee fowl's work?",
    type: 'multiple_choice',
    options: [
      "A) It is demanding and almost constant.",
      "B) It is shared equally with the female.",
      "C) It finishes as soon as the eggs are laid.",
      "D) It succeeds mostly by luck."
    ],
    correct_answer: "A) It is demanding and almost constant.",
    difficulty: 7,
    topic_id: 'reading_inference',
    passage: "The mallee fowl is one of the few birds that never sits on its eggs. Instead, the male spends up to eleven months of the year tending an enormous mound of sand and rotting leaves. As the leaves break down they release heat, and the male tests the temperature of the mound by pushing his beak deep into it. If the mound grows too warm he scrapes sand away; if it cools he piles more on. The chicks hatch underground and dig their way to the surface alone, receiving no help and no food from either parent.",
    hint: "Look at how long he spends on the mound and how often he has to check it.",
    explanation: "Eleven months of the year, with the temperature checked and corrected in both directions, adds up to relentless work, even though the passage never uses the word 'hard'. Nothing in the text mentions the female helping, so option B goes beyond the evidence."
  },
  {
    question: "In this passage, the word 'tending' most nearly means:",
    type: 'multiple_choice',
    options: [
      "A) moving towards",
      "B) leaning on",
      "C) looking after",
      "D) guarding against"
    ],
    correct_answer: "C) looking after",
    difficulty: 6,
    topic_id: 'reading_vocabulary',
    passage: "The mallee fowl is one of the few birds that never sits on its eggs. Instead, the male spends up to eleven months of the year tending an enormous mound of sand and rotting leaves. As the leaves break down they release heat, and the male tests the temperature of the mound by pushing his beak deep into it. If the mound grows too warm he scrapes sand away; if it cools he piles more on. The chicks hatch underground and dig their way to the surface alone, receiving no help and no food from either parent.",
    hint: "Substitute each option into the sentence and see which keeps the meaning.",
    explanation: "The male builds, tests and adjusts the mound, which is looking after it. 'Tend' can mean 'move towards' in other sentences, which is why that option is offered, but it makes no sense with a mound of sand."
  },
  {
    question: "What is the author's main purpose in this passage?",
    type: 'multiple_choice',
    options: [
      "A) To persuade readers to protect the mallee fowl.",
      "B) To explain an unusual nesting behaviour.",
      "C) To describe a personal encounter with a bird.",
      "D) To compare two Australian birds."
    ],
    correct_answer: "B) To explain an unusual nesting behaviour.",
    difficulty: 6,
    topic_id: 'reading_author_intent',
    passage: "The mallee fowl is one of the few birds that never sits on its eggs. Instead, the male spends up to eleven months of the year tending an enormous mound of sand and rotting leaves. As the leaves break down they release heat, and the male tests the temperature of the mound by pushing his beak deep into it. If the mound grows too warm he scrapes sand away; if it cools he piles more on. The chicks hatch underground and dig their way to the surface alone, receiving no help and no food from either parent.",
    hint: "Is the writer arguing, telling a story, or informing?",
    explanation: "The passage gives neutral factual information about how the mound works, with no argument, no narrator and no second bird. When a text explains how something works without taking a side, its purpose is to inform."
  },
  {
    question: "Why does the author describe what the male does when the mound is too warm and when it is too cool?",
    type: 'multiple_choice',
    options: [
      "A) To show how carefully the temperature is controlled.",
      "B) To prove that sand holds heat well.",
      "C) To explain why the chicks hatch underground.",
      "D) To suggest the bird is easily confused."
    ],
    correct_answer: "A) To show how carefully the temperature is controlled.",
    difficulty: 6,
    topic_id: 'reading_text_structure',
    passage: "The mallee fowl is one of the few birds that never sits on its eggs. Instead, the male spends up to eleven months of the year tending an enormous mound of sand and rotting leaves. As the leaves break down they release heat, and the male tests the temperature of the mound by pushing his beak deep into it. If the mound grows too warm he scrapes sand away; if it cools he piles more on. The chicks hatch underground and dig their way to the surface alone, receiving no help and no food from either parent.",
    hint: "Ask what the pair of opposite examples achieves together.",
    explanation: "Giving both directions - scraping sand away and piling it on - shows the male correcting the mound either way, which demonstrates fine control. A single example would have shown effort; the pair shows precision."
  },

  // ── Reading Comprehension: literary passage (the lighthouse) ──────────────
  {
    question: "Why is Nina climbing the lighthouse tonight?",
    type: 'multiple_choice',
    options: [
      "A) To replace a bulb so the light keeps working.",
      "B) To count the steps again.",
      "C) To look for her grandfather.",
      "D) To shelter from the storm."
    ],
    correct_answer: "A) To replace a bulb so the light keeps working.",
    difficulty: 6,
    topic_id: 'reading_inference',
    passage: "Nina had counted the lighthouse steps so many times that she no longer needed to look at her feet. One hundred and thirty-two. Tonight she took them two at a time, the torch beam jumping ahead of her. Her grandfather had kept the light for forty years and had never once let it fail, not in the storm of sixty-eight, not on the night the power lines came down. The wind pressed against the tower like a hand. At the top, Nina set down the spare bulb and looked out at the black water. Somewhere out there, a boat was waiting for her to be as reliable as he had been.",
    hint: "One object she is carrying tells you the reason.",
    explanation: "She sets down a spare bulb at the top, and the passage stresses that the light has never failed - so she is there to keep it lit. The text never says so directly, which is what makes this an inference."
  },
  {
    question: "Which sentence best summarises the passage?",
    type: 'multiple_choice',
    options: [
      "A) A girl climbs a lighthouse to carry on her grandfather's duty.",
      "B) A storm damages a lighthouse and brings down its power lines.",
      "C) A girl learns to count the steps of a tower in the dark.",
      "D) A boat is lost at sea near a lighthouse."
    ],
    correct_answer: "A) A girl climbs a lighthouse to carry on her grandfather's duty.",
    difficulty: 6,
    topic_id: 'reading_main_idea',
    passage: "Nina had counted the lighthouse steps so many times that she no longer needed to look at her feet. One hundred and thirty-two. Tonight she took them two at a time, the torch beam jumping ahead of her. Her grandfather had kept the light for forty years and had never once let it fail, not in the storm of sixty-eight, not on the night the power lines came down. The wind pressed against the tower like a hand. At the top, Nina set down the spare bulb and looked out at the black water. Somewhere out there, a boat was waiting for her to be as reliable as he had been.",
    hint: "A summary must cover the whole passage, not one striking detail.",
    explanation: "The climb, the grandfather's record and the waiting boat all point to one thing: Nina taking up his responsibility. The storm and the power lines are memories used as background, not the events of tonight."
  },
  {
    question: "'The wind pressed against the tower like a hand' suggests the wind was:",
    type: 'multiple_choice',
    options: [
      "A) warm and gentle",
      "B) strong and steady",
      "C) brief and sudden",
      "D) barely noticeable"
    ],
    correct_answer: "B) strong and steady",
    difficulty: 7,
    topic_id: 'reading_vocabulary',
    passage: "Nina had counted the lighthouse steps so many times that she no longer needed to look at her feet. One hundred and thirty-two. Tonight she took them two at a time, the torch beam jumping ahead of her. Her grandfather had kept the light for forty years and had never once let it fail, not in the storm of sixty-eight, not on the night the power lines came down. The wind pressed against the tower like a hand. At the top, Nina set down the spare bulb and looked out at the black water. Somewhere out there, a boat was waiting for her to be as reliable as he had been.",
    hint: "Think about how a hand pushes, compared with how a gust hits.",
    explanation: "A hand presses with continuous, deliberate force, so the image suggests wind that is both powerful and sustained. A sudden gust would have been described as a blow or a slap, not a press."
  },
  {
    question: "The author mentions the storm of sixty-eight and the fallen power lines mainly to:",
    type: 'multiple_choice',
    options: [
      "A) show how dependable her grandfather had been",
      "B) explain why the lighthouse was built",
      "C) warn the reader about dangerous weather",
      "D) suggest the lighthouse is unsafe"
    ],
    correct_answer: "A) show how dependable her grandfather had been",
    difficulty: 7,
    topic_id: 'reading_author_intent',
    passage: "Nina had counted the lighthouse steps so many times that she no longer needed to look at her feet. One hundred and thirty-two. Tonight she took them two at a time, the torch beam jumping ahead of her. Her grandfather had kept the light for forty years and had never once let it fail, not in the storm of sixty-eight, not on the night the power lines came down. The wind pressed against the tower like a hand. At the top, Nina set down the spare bulb and looked out at the black water. Somewhere out there, a boat was waiting for her to be as reliable as he had been.",
    hint: "Notice what both examples have in common: the light stayed on.",
    explanation: "Both are worst-case nights on which the light still did not fail, which builds a picture of complete reliability - the standard Nina now has to meet. Details in a narrative usually exist to develop character rather than to inform."
  },
  {
    question: "The final sentence is effective because it:",
    type: 'multiple_choice',
    options: [
      "A) links Nina's climb to the responsibility she now carries",
      "B) introduces an important new character",
      "C) explains how a lighthouse lamp works",
      "D) returns to the number of steps she counted"
    ],
    correct_answer: "A) links Nina's climb to the responsibility she now carries",
    difficulty: 7,
    topic_id: 'reading_text_structure',
    passage: "Nina had counted the lighthouse steps so many times that she no longer needed to look at her feet. One hundred and thirty-two. Tonight she took them two at a time, the torch beam jumping ahead of her. Her grandfather had kept the light for forty years and had never once let it fail, not in the storm of sixty-eight, not on the night the power lines came down. The wind pressed against the tower like a hand. At the top, Nina set down the spare bulb and looked out at the black water. Somewhere out there, a boat was waiting for her to be as reliable as he had been.",
    hint: "Ask what the last sentence adds that the rest of the passage had not yet said.",
    explanation: "The waiting boat turns a physical climb into an obligation, and naming her grandfather again ties her actions to his record. A strong closing sentence usually reframes what came before rather than adding new information."
  },

  // ── Reading Comprehension: persuasive passage (school start times) ────────
  {
    question: "What is the author's purpose in this passage?",
    type: 'multiple_choice',
    options: [
      "A) To argue that schools should start later.",
      "B) To explain how the human body clock works.",
      "C) To describe a typical school morning.",
      "D) To compare schools on three continents."
    ],
    correct_answer: "A) To argue that schools should start later.",
    difficulty: 5,
    topic_id: 'reading_author_intent',
    passage: "Ask any teenager to describe a school morning and you will hear the same word: exhausted. Research from three continents now shows that adolescent body clocks shift later during puberty, so a fifteen-year-old told to sleep at nine simply lies awake. Schools that have pushed their start time back to 9am report fewer late arrivals, better marks and, most strikingly, fewer accidents among student drivers. Critics say a later start would disrupt families and sport. Those are real problems - but they are problems of timetabling, and timetables can be redrawn. Sleep cannot.",
    hint: "Look at the last two sentences - is the writer neutral?",
    explanation: "The passage raises an objection only to dismiss it and closes with a firm statement, which is the shape of an argument rather than an explanation. Informational writing does not answer its critics."
  },
  {
    question: "The author includes the point about student drivers because it:",
    type: 'multiple_choice',
    options: [
      "A) gives the argument a consequence readers will take seriously",
      "B) proves that teenagers are careless drivers",
      "C) shows that schools are unsafe places",
      "D) explains why the research was carried out"
    ],
    correct_answer: "A) gives the argument a consequence readers will take seriously",
    difficulty: 8,
    topic_id: 'reading_inference',
    passage: "Ask any teenager to describe a school morning and you will hear the same word: exhausted. Research from three continents now shows that adolescent body clocks shift later during puberty, so a fifteen-year-old told to sleep at nine simply lies awake. Schools that have pushed their start time back to 9am report fewer late arrivals, better marks and, most strikingly, fewer accidents among student drivers. Critics say a later start would disrupt families and sport. Those are real problems - but they are problems of timetabling, and timetables can be redrawn. Sleep cannot.",
    hint: "Compare the weight of that point with the other two benefits listed.",
    explanation: "Late arrivals and marks are school problems, but road accidents are a matter of safety, which is why the author calls it the most striking finding. Persuasive writers save their heaviest consequence for last."
  },
  {
    question: "In this passage, the word 'disrupt' most nearly means:",
    type: 'multiple_choice',
    options: [
      "A) improve slightly",
      "B) delay briefly",
      "C) throw into disorder",
      "D) cancel completely"
    ],
    correct_answer: "C) throw into disorder",
    difficulty: 6,
    topic_id: 'reading_vocabulary',
    passage: "Ask any teenager to describe a school morning and you will hear the same word: exhausted. Research from three continents now shows that adolescent body clocks shift later during puberty, so a fifteen-year-old told to sleep at nine simply lies awake. Schools that have pushed their start time back to 9am report fewer late arrivals, better marks and, most strikingly, fewer accidents among student drivers. Critics say a later start would disrupt families and sport. Those are real problems - but they are problems of timetabling, and timetables can be redrawn. Sleep cannot.",
    hint: "The critics are describing what a later start would do to family routines.",
    explanation: "The critics fear that existing arrangements would be thrown out of order, which is what 'disrupt' means. It is stronger than a brief delay but weaker than cancelling something outright."
  },
  {
    question: "Why does the author mention what critics say?",
    type: 'multiple_choice',
    options: [
      "A) To acknowledge the objection and then answer it.",
      "B) To change the subject.",
      "C) To admit that the argument has failed.",
      "D) To introduce a new piece of research."
    ],
    correct_answer: "A) To acknowledge the objection and then answer it.",
    difficulty: 7,
    topic_id: 'reading_text_structure',
    passage: "Ask any teenager to describe a school morning and you will hear the same word: exhausted. Research from three continents now shows that adolescent body clocks shift later during puberty, so a fifteen-year-old told to sleep at nine simply lies awake. Schools that have pushed their start time back to 9am report fewer late arrivals, better marks and, most strikingly, fewer accidents among student drivers. Critics say a later start would disrupt families and sport. Those are real problems - but they are problems of timetabling, and timetables can be redrawn. Sleep cannot.",
    hint: "Read the sentence that comes immediately after the critics are mentioned.",
    explanation: "The author calls the objections real, then reduces them to a timetabling problem that can be solved - raising a counter-argument in order to defeat it. Handling the other side directly makes an argument harder to dismiss."
  },
  {
    question: "Which statement best expresses the author's main claim?",
    type: 'multiple_choice',
    options: [
      "A) Later start times solve a biological problem, and the practical objections can be worked around.",
      "B) Teenagers should simply go to bed earlier.",
      "C) Sport and family routines matter more than sleep.",
      "D) Research from three continents cannot be relied on."
    ],
    correct_answer: "A) Later start times solve a biological problem, and the practical objections can be worked around.",
    difficulty: 6,
    topic_id: 'reading_main_idea',
    passage: "Ask any teenager to describe a school morning and you will hear the same word: exhausted. Research from three continents now shows that adolescent body clocks shift later during puberty, so a fifteen-year-old told to sleep at nine simply lies awake. Schools that have pushed their start time back to 9am report fewer late arrivals, better marks and, most strikingly, fewer accidents among student drivers. Critics say a later start would disrupt families and sport. Those are real problems - but they are problems of timetabling, and timetables can be redrawn. Sleep cannot.",
    hint: "Combine the biological evidence with the way the author deals with the critics.",
    explanation: "The passage argues both halves: body clocks make early starts unworkable, and the objections are matters of scheduling rather than principle. Option B is exactly the view the author sets out to refute."
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
