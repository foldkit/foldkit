import { Array, Effect, Function, Random, pipe } from 'effect'

const theUniverse =
  "The universe, what a concept. You know, the universe is a little bit like the human hand. For example, you have Growman's center right here and then you have undiscovered worlds. And, um, sector 8. And up here we have Tittleman's Crest so you can kind of picture it’s a little bit like a leaf or a... it’s not a bowl. The time it takes to get from one star to another star is - you need to travel at the speed of light. And us humans, we can’t fathom the concept of that kind of time because it's really, really, really, really, really, really, really, really fun to think about taking a speed of light ride."

const neverGonnaGiveYouUp =
  "We're no strangers to love. You know the rules and so do I. A full commitment's what I'm thinkin' of. You wouldn't get this from any other guy. I just wanna tell you how I'm feeling. Gotta make you understand. Never gonna give you up, never gonna let you down. Never gonna run around and desert you. Never gonna make you cry, never gonna say goodbye. Never gonna tell a lie and hurt you. We've known each other for so long. Your heart's been aching, but you're too shy to say it. Inside, we both know what's been going on. We know the game and we're gonna play it. And if you ask me how I'm feeling. Don't tell me you're too blind to see."

const augustHealthMission =
  "Our mission is to empower the essential work of caring for our elders. Caregivers need our support more than ever before. Caregivers are the living embodiment of senior living communities' commitment to care, compassion, and well-being. However, caregivers shoulder an ever-growing burden, navigating the complexities of higher resident acuity and volatile staffing environments. The truth is undeniable: caring for residents is not just demanding—it remains a highly manual, often unsustainable endeavor. While communities strive to address the challenges of staff hiring, retention, and morale, the hurdles remain daunting."

const toBeOrNotToBe =
  'To be, or not to be, that is the question: Whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and end them. To die, to sleep no more; and by a sleep to say we end the heartache and the thousand natural shocks that flesh is heir to. It is a consummation devoutly to be wished. To die, to sleep. To sleep, perchance to dream—ay, there is the rub, for in that sleep of death what dreams may come when we have shuffled off this mortal coil, must give us pause.'

const programmingWisdom =
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. The best programs are written in a way that is both elegant and simple, where each piece serves a clear purpose. When debugging, novices insert corrective code; experts remove defective code. Always code as if the person who ends up maintaining your code is a violent psychopath who knows where you live. Code never lies, comments sometimes do.'

const philosophicalThought =
  'I think, therefore I am. This simple yet profound statement captures the essence of self-awareness and existence. Our consciousness is the one thing we cannot doubt, for even doubt itself requires a thinking entity. In the vast expanse of reality, we find ourselves as observers and participants, constantly questioning the nature of our being and our place in the cosmos. Knowledge begins with wonder, and wonder begins with the recognition of how much we do not know.'

const motivationalQuote =
  'The future belongs to those who believe in the beauty of their dreams. Success is not final, failure is not fatal: it is the courage to continue that counts. Do not wait for the perfect moment, take the moment and make it perfect. Your only limitation is your imagination. The distance between your dreams and reality is called action. Every accomplishment starts with the decision to try.'

const scienceExplanation =
  'The quantum world operates on principles that seem to defy common sense. Particles can exist in multiple states simultaneously until observed, a phenomenon known as superposition. They can also be entangled, instantly affecting each other regardless of the distance between them. These strange behaviors are not just theoretical curiosities—they form the foundation of emerging technologies like quantum computers, which promise to revolutionize computation by processing information in fundamentally new ways.'

const literaryPassage =
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.'

const modernLife =
  "In the digital age, we are more connected than ever before, yet somehow we have never been more alone. We scroll through endless feeds of curated perfection, comparing our behind-the-scenes to everyone else's highlight reel. We chase notifications like digital breadcrumbs, hoping they will lead us somewhere meaningful. We have access to all the information in the world at our fingertips, yet wisdom remains as elusive as ever. Perhaps the challenge of our time is not to gather more information, but to find the quiet space to think deeply about what truly matters."

export const GAME_TEXTS: Array.NonEmptyReadonlyArray<string> = [
  theUniverse,
  neverGonnaGiveYouUp,
  augustHealthMission,
  toBeOrNotToBe,
  programmingWisdom,
  philosophicalThought,
  motivationalQuote,
  scienceExplanation,
  literaryPassage,
  modernLife,
]

export const generateGameText = (
  usedGameTexts: ReadonlyArray<string>,
): Effect.Effect<string> => {
  const availableTexts = pipe(
    Array.difference(GAME_TEXTS, usedGameTexts),
    Array.match({
      onEmpty: () => GAME_TEXTS,
      onNonEmpty: Function.identity,
    }),
  )

  return Random.nextIntBetween(0, Array.length(availableTexts)).pipe(
    Effect.map(index => Array.getUnsafe(availableTexts, index)),
  )
}
