import type { Dosha } from '../types';

export const QUIZ_QUESTIONS: { question: string; hint: string; options: { label: string; dosha: Dosha }[] }[] = [
  { question: 'How would you describe your natural energy?', hint: 'Think about your usual rhythm, not just today.', options: [{ label: 'Quick bursts, then I need a recharge', dosha: 'vata' }, { label: 'Focused and driven, with a steady spark', dosha: 'pitta' }, { label: 'Steady and enduring, once I get going', dosha: 'kapha' }] },
  { question: 'What feels most like your natural build?', hint: 'There is no ideal shape. This is a traditional lens.', options: [{ label: 'Light, with a tendency to feel cool', dosha: 'vata' }, { label: 'Medium, and I often feel warm', dosha: 'pitta' }, { label: 'Solid, with a naturally grounded feeling', dosha: 'kapha' }] },
  { question: 'How do you usually approach a busy day?', hint: 'Choose the response that comes most naturally.', options: [{ label: 'I have lots of ideas and move between them', dosha: 'vata' }, { label: 'I make a plan and focus on getting it done', dosha: 'pitta' }, { label: 'I take my time and stay with one thing', dosha: 'kapha' }] },
  { question: 'Which kind of weather feels most comfortable?', hint: 'Your everyday preference, rather than a holiday memory.', options: [{ label: 'Warm, gently humid days', dosha: 'vata' }, { label: 'Cool, fresh mornings', dosha: 'pitta' }, { label: 'Warm, dry and bright afternoons', dosha: 'kapha' }] },
  { question: 'What would a restorative afternoon look like?', hint: 'Imagine an afternoon with nothing you have to do.', options: [{ label: 'A change of scene and a little creative freedom', dosha: 'vata' }, { label: 'A quiet walk somewhere cool and green', dosha: 'pitta' }, { label: 'A slow, comforting routine close to home', dosha: 'kapha' }] },
];
export const DOSHA_COPY: Record<string, { name: string; element: string; description: string }> = {
  vata: { name: 'Vata', element: 'Air & space', description: 'The rhythm of movement and creativity. In Ayurvedic tradition, Vata invites grounding, warmth and a little more stillness.' },
  pitta: { name: 'Pitta', element: 'Fire & water', description: 'The rhythm of focus and transformation. Pitta invites a softer pace, cooling moments and space to simply be.' },
  kapha: { name: 'Kapha', element: 'Earth & water', description: 'The rhythm of steadiness and connection. Kapha invites gentle movement, fresh experiences and a little lightness.' },
  'vata-pitta': { name: 'Vata-Pitta', element: 'Movement & transformation', description: 'Your answers share two rhythms. Explore grounding warmth alongside cooling, unhurried moments. This is a starting point, not a diagnosis.' },
  'vata-kapha': { name: 'Vata-Kapha', element: 'Movement & steadiness', description: 'Your answers share two rhythms. Explore a balance of gentle stimulation and comforting routine, guided by what feels right today.' },
  'pitta-kapha': { name: 'Pitta-Kapha', element: 'Transformation & steadiness', description: 'Your answers share two rhythms. Explore fresh, gentle movement with cooling moments of rest. A traditional lens, not a health assessment.' },
  tridoshic: { name: 'Tridoshic', element: 'A meeting of all three', description: 'Your answers are evenly balanced across all three patterns. Explore a gentle, adaptable ritual and let your comfort guide you.' },
};
export function scoreQuiz(answers: readonly Dosha[]) {
  if (answers.length !== QUIZ_QUESTIONS.length || answers.some((answer) => !['vata', 'pitta', 'kapha'].includes(answer))) throw new Error('Answer all five questions.');
  const scores = { vata: 0, pitta: 0, kapha: 0 };
  for (const answer of answers) scores[answer] += 1;
  const highest = Math.max(...Object.values(scores));
  const leaders = (Object.keys(scores) as Dosha[]).filter((key) => scores[key] === highest);
  const result = leaders.length === 3 ? 'tridoshic' : leaders.join('-');
  return { scores, result, doshas: leaders, copy: DOSHA_COPY[result]! };
}
