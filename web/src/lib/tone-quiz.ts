// No server imports allowed in this file - used by client components

export interface WritingPrompt {
  id: string;
  title: string;
  scenario: string;
  placeholder: string;
  minLength: number;
}

export interface WritingSample {
  promptId: string;
  response: string;
}

export interface ToneProfile {
  formality: number; // 0-100
  warmth: number; // 0-100
  directness: number; // 0-100
  energy: number; // 0-100
  humor: number; // 0-100
  archetype: string; // e.g. "The Connector", "The Strategist"
  description: string; // 2-sentence description of their style
}

export interface QuizQuestion {
  id: number;
  text: string;
  tier: "free" | "pro";
  options: Array<{
    text: string;
    scores: {
      formality: number;
      warmth: number;
      directness: number;
      energy: number;
      humor: number;
    };
  }>;
}

// Quiz questions - Free tier (5 questions)
export const FREE_TIER_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "When you meet someone new at a networking event, you usually...",
    tier: "free",
    options: [
      {
        text: "Jump right into conversation",
        scores: { formality: 20, warmth: 60, directness: 70, energy: 80, humor: 40 },
      },
      {
        text: "Wait for them to approach",
        scores: { formality: 70, warmth: 30, directness: 20, energy: 20, humor: 10 },
      },
      {
        text: "Find common ground first",
        scores: { formality: 40, warmth: 80, directness: 40, energy: 50, humor: 30 },
      },
      {
        text: "Keep it brief and professional",
        scores: { formality: 80, warmth: 40, directness: 70, energy: 30, humor: 20 },
      },
    ],
  },
  {
    id: 2,
    text: "Your ideal email to a stranger is...",
    tier: "free",
    options: [
      {
        text: "Short and direct",
        scores: { formality: 70, warmth: 30, directness: 90, energy: 30, humor: 20 },
      },
      {
        text: "Warm and personal",
        scores: { formality: 30, warmth: 90, directness: 40, energy: 60, humor: 50 },
      },
      {
        text: "Detailed and thorough",
        scores: { formality: 80, warmth: 40, directness: 50, energy: 30, humor: 10 },
      },
      {
        text: "Casual and conversational",
        scores: { formality: 20, warmth: 70, directness: 60, energy: 70, humor: 70 },
      },
    ],
  },
  {
    id: 3,
    text: "When asking for help, you prefer to...",
    tier: "free",
    options: [
      {
        text: "Be upfront about what you need",
        scores: { formality: 60, warmth: 40, directness: 90, energy: 40, humor: 20 },
      },
      {
        text: "Build rapport first",
        scores: { formality: 40, warmth: 90, directness: 30, energy: 60, humor: 40 },
      },
      {
        text: "Offer something in return",
        scores: { formality: 50, warmth: 70, directness: 50, energy: 50, humor: 30 },
      },
      {
        text: "Keep it low-pressure",
        scores: { formality: 40, warmth: 80, directness: 40, energy: 40, humor: 40 },
      },
    ],
  },
  {
    id: 4,
    text: "In professional settings, your tone is usually...",
    tier: "free",
    options: [
      {
        text: "Formal and polished",
        scores: { formality: 90, warmth: 30, directness: 60, energy: 20, humor: 10 },
      },
      {
        text: "Friendly but professional",
        scores: { formality: 60, warmth: 70, directness: 50, energy: 50, humor: 40 },
      },
      {
        text: "Relaxed and approachable",
        scores: { formality: 30, warmth: 80, directness: 60, energy: 60, humor: 60 },
      },
      {
        text: "Enthusiastic and energetic",
        scores: { formality: 40, warmth: 70, directness: 70, energy: 90, humor: 70 },
      },
    ],
  },
  {
    id: 5,
    text: "When following up with someone, you...",
    tier: "free",
    options: [
      {
        text: "Keep it short - just checking in",
        scores: { formality: 50, warmth: 40, directness: 80, energy: 30, humor: 20 },
      },
      {
        text: "Reference your last conversation",
        scores: { formality: 60, warmth: 70, directness: 50, energy: 40, humor: 40 },
      },
      {
        text: "Add new value or context",
        scores: { formality: 70, warmth: 50, directness: 60, energy: 50, humor: 20 },
      },
      {
        text: "Use humor to stay memorable",
        scores: { formality: 20, warmth: 60, directness: 50, energy: 70, humor: 90 },
      },
    ],
  },
];

// Pro tier questions (10 additional questions)
export const PRO_TIER_QUESTIONS: QuizQuestion[] = [
  {
    id: 6,
    text: "What energizes you most about your work?",
    tier: "pro",
    options: [
      {
        text: "Solving complex problems",
        scores: { formality: 70, warmth: 30, directness: 80, energy: 60, humor: 20 },
      },
      {
        text: "Collaborating with people",
        scores: { formality: 40, warmth: 90, directness: 50, energy: 80, humor: 60 },
      },
      {
        text: "Creating something new",
        scores: { formality: 30, warmth: 50, directness: 60, energy: 90, humor: 70 },
      },
      {
        text: "Making an impact",
        scores: { formality: 50, warmth: 70, directness: 70, energy: 70, humor: 40 },
      },
    ],
  },
  {
    id: 7,
    text: "How do you prefer to start a conversation with someone you admire?",
    tier: "pro",
    options: [
      {
        text: "Compliment their work specifically",
        scores: { formality: 50, warmth: 70, directness: 60, energy: 60, humor: 30 },
      },
      {
        text: "Ask a thoughtful question",
        scores: { formality: 60, warmth: 60, directness: 50, energy: 40, humor: 30 },
      },
      {
        text: "Share a relevant experience",
        scores: { formality: 40, warmth: 80, directness: 50, energy: 60, humor: 50 },
      },
      {
        text: "Be direct about why you're reaching out",
        scores: { formality: 70, warmth: 40, directness: 90, energy: 40, humor: 20 },
      },
    ],
  },
  {
    id: 8,
    text: "When writing a LinkedIn message, you spend the most time on...",
    tier: "pro",
    options: [
      {
        text: "The opening line",
        scores: { formality: 30, warmth: 70, directness: 50, energy: 80, humor: 80 },
      },
      {
        text: "Explaining your background",
        scores: { formality: 80, warmth: 40, directness: 70, energy: 30, humor: 10 },
      },
      {
        text: "The ask or call to action",
        scores: { formality: 70, warmth: 30, directness: 90, energy: 40, humor: 20 },
      },
      {
        text: "Making it feel natural",
        scores: { formality: 40, warmth: 80, directness: 50, energy: 60, humor: 60 },
      },
    ],
  },
  {
    id: 9,
    text: "Your friends would describe your communication style as...",
    tier: "pro",
    options: [
      {
        text: "Witty and clever",
        scores: { formality: 30, warmth: 60, directness: 60, energy: 70, humor: 90 },
      },
      {
        text: "Warm and genuine",
        scores: { formality: 30, warmth: 90, directness: 40, energy: 60, humor: 50 },
      },
      {
        text: "Clear and to-the-point",
        scores: { formality: 70, warmth: 40, directness: 90, energy: 40, humor: 20 },
      },
      {
        text: "Thoughtful and measured",
        scores: { formality: 70, warmth: 70, directness: 40, energy: 30, humor: 20 },
      },
    ],
  },
  {
    id: 10,
    text: "When you get a cold message that impresses you, it usually...",
    tier: "pro",
    options: [
      {
        text: "Shows they did their homework",
        scores: { formality: 70, warmth: 40, directness: 70, energy: 40, humor: 20 },
      },
      {
        text: "Feels personal, not templated",
        scores: { formality: 40, warmth: 90, directness: 50, energy: 60, humor: 50 },
      },
      {
        text: "Gets to the point fast",
        scores: { formality: 60, warmth: 30, directness: 90, energy: 50, humor: 20 },
      },
      {
        text: "Has an interesting hook",
        scores: { formality: 30, warmth: 60, directness: 60, energy: 80, humor: 80 },
      },
    ],
  },
  {
    id: 11,
    text: "In group settings, you tend to...",
    tier: "pro",
    options: [
      {
        text: "Lead the conversation",
        scores: { formality: 40, warmth: 60, directness: 80, energy: 90, humor: 70 },
      },
      {
        text: "Listen and contribute when you have something valuable",
        scores: { formality: 70, warmth: 70, directness: 50, energy: 40, humor: 30 },
      },
      {
        text: "Make sure everyone feels included",
        scores: { formality: 40, warmth: 90, directness: 40, energy: 60, humor: 50 },
      },
      {
        text: "Crack jokes to keep it light",
        scores: { formality: 20, warmth: 70, directness: 60, energy: 80, humor: 90 },
      },
    ],
  },
  {
    id: 12,
    text: "What matters most to you in professional relationships?",
    tier: "pro",
    options: [
      {
        text: "Mutual respect and competence",
        scores: { formality: 80, warmth: 40, directness: 70, energy: 40, humor: 20 },
      },
      {
        text: "Genuine human connection",
        scores: { formality: 30, warmth: 90, directness: 50, energy: 70, humor: 50 },
      },
      {
        text: "Reliability and follow-through",
        scores: { formality: 80, warmth: 50, directness: 70, energy: 30, humor: 20 },
      },
      {
        text: "Shared interests and values",
        scores: { formality: 40, warmth: 80, directness: 50, energy: 60, humor: 50 },
      },
    ],
  },
  {
    id: 13,
    text: "When someone helps you, you typically...",
    tier: "pro",
    options: [
      {
        text: "Send a thoughtful thank-you note",
        scores: { formality: 70, warmth: 80, directness: 40, energy: 40, humor: 20 },
      },
      {
        text: "Express gratitude immediately and effusively",
        scores: { formality: 20, warmth: 90, directness: 60, energy: 80, humor: 60 },
      },
      {
        text: "Pay it forward to someone else",
        scores: { formality: 40, warmth: 80, directness: 60, energy: 70, humor: 40 },
      },
      {
        text: "Remember and reciprocate later",
        scores: { formality: 60, warmth: 70, directness: 50, energy: 40, humor: 30 },
      },
    ],
  },
  {
    id: 14,
    text: "Your approach to networking is...",
    tier: "pro",
    options: [
      {
        text: "Strategic - target the right people",
        scores: { formality: 70, warmth: 30, directness: 80, energy: 50, humor: 20 },
      },
      {
        text: "Organic - let connections happen naturally",
        scores: { formality: 40, warmth: 80, directness: 40, energy: 50, humor: 50 },
      },
      {
        text: "Generous - help others first",
        scores: { formality: 40, warmth: 90, directness: 50, energy: 70, humor: 50 },
      },
      {
        text: "Efficient - make the most of every interaction",
        scores: { formality: 70, warmth: 40, directness: 80, energy: 60, humor: 30 },
      },
    ],
  },
  {
    id: 15,
    text: "What's your biggest pet peeve in professional communication?",
    tier: "pro",
    options: [
      {
        text: "Messages that are too long",
        scores: { formality: 60, warmth: 30, directness: 80, energy: 30, humor: 20 },
      },
      {
        text: "Messages that feel fake or scripted",
        scores: { formality: 30, warmth: 90, directness: 60, energy: 60, humor: 60 },
      },
      {
        text: "Messages with no clear purpose",
        scores: { formality: 80, warmth: 40, directness: 90, energy: 30, humor: 10 },
      },
      {
        text: "Messages that are too pushy",
        scores: { formality: 50, warmth: 70, directness: 50, energy: 40, humor: 40 },
      },
    ],
  },
];

export const ALL_QUESTIONS = [...FREE_TIER_QUESTIONS, ...PRO_TIER_QUESTIONS];

// Writing prompts for Pro tier (collected after questions)
export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: "email_reply",
    title: "Reply to a Work Email",
    scenario: "Your coworker Sarah just sent you this email:\n\nHey! I wanted to let you know that the client loved the presentation we put together. They want to move forward with the project and are asking if we can start next week. I know that's tight - what do you think?\n\nWrite your reply to Sarah.",
    placeholder: "Type your reply here...",
    minLength: 50,
  },
  {
    id: "story",
    title: "Tell a Quick Story",
    scenario: "Think of a time something unexpectedly funny or memorable happened at work or school. Write a few sentences about what happened, like you're telling a friend.",
    placeholder: "Once, I was...",
    minLength: 50,
  },
  {
    id: "boss_request",
    title: "Respond to Your Manager",
    scenario: "Your manager just messaged you:\n\nHey, I need someone to lead the demo for the new client on Thursday. You'd be presenting to their VP of Engineering. Are you up for it?\n\nWrite your response.",
    placeholder: "Type your response here...",
    minLength: 30,
  },
];

interface AnswerSet {
  [questionId: number]: number; // index of selected option
}

export function calculateToneProfile(answers: AnswerSet, isPro: boolean): ToneProfile {
  // Get questions to consider based on tier
  const questionsToUse = isPro ? ALL_QUESTIONS : FREE_TIER_QUESTIONS;

  // Aggregate scores
  let totalScores = {
    formality: 0,
    warmth: 0,
    directness: 0,
    energy: 0,
    humor: 0,
  };

  let answerCount = 0;

  for (const question of questionsToUse) {
    const selectedOptionIndex = answers[question.id];
    if (selectedOptionIndex !== undefined && selectedOptionIndex >= 0) {
      const option = question.options[selectedOptionIndex];
      if (option) {
        totalScores.formality += option.scores.formality;
        totalScores.warmth += option.scores.warmth;
        totalScores.directness += option.scores.directness;
        totalScores.energy += option.scores.energy;
        totalScores.humor += option.scores.humor;
        answerCount++;
      }
    }
  }

  // Calculate averages
  const averages = answerCount > 0 ? {
    formality: Math.round(totalScores.formality / answerCount),
    warmth: Math.round(totalScores.warmth / answerCount),
    directness: Math.round(totalScores.directness / answerCount),
    energy: Math.round(totalScores.energy / answerCount),
    humor: Math.round(totalScores.humor / answerCount),
  } : {
    formality: 50,
    warmth: 50,
    directness: 50,
    energy: 50,
    humor: 50,
  };

  // Determine archetype based on dominant dimensions
  const archetype = determineArchetype(averages);
  const description = getArchetypeDescription(archetype);

  return {
    formality: averages.formality,
    warmth: averages.warmth,
    directness: averages.directness,
    energy: averages.energy,
    humor: averages.humor,
    archetype,
    description,
  };
}

function determineArchetype(scores: {
  formality: number;
  warmth: number;
  directness: number;
  energy: number;
  humor: number;
}): string {
  const { formality, warmth, directness, energy, humor } = scores;

  // Determine archetype based on dominant characteristics
  // The Connector: high warmth + high energy + moderate formality
  if (warmth > 70 && energy > 70 && formality < 70) {
    return "The Connector";
  }

  // The Strategist: high directness + moderate-high formality + low humor
  if (directness > 75 && formality > 60 && humor < 40) {
    return "The Strategist";
  }

  // The Natural: high humor + low formality + high warmth
  if (humor > 75 && formality < 40 && warmth > 70) {
    return "The Natural";
  }

  // The Professional: high formality + high directness + moderate warmth
  if (formality > 75 && directness > 65) {
    return "The Professional";
  }

  // The Storyteller: moderate warmth + low directness + high energy
  if (warmth > 60 && directness < 50 && energy > 70) {
    return "The Storyteller";
  }

  // The Minimalist: high directness + low energy + low warmth
  if (directness > 70 && energy < 50 && warmth < 50) {
    return "The Minimalist";
  }

  // Default: The Balanced (if no archetype strongly matches)
  return "The Balanced";
}

function getArchetypeDescription(archetype: string): string {
  const descriptions: Record<string, string> = {
    "The Connector": "You're energized by people and relationships. Your messages are warm, engaging, and build genuine connections, making people feel valued and heard.",
    "The Strategist": "You're focused and purposeful. Your communication is clear, direct, and efficient, cutting through noise to make your points land with impact.",
    "The Natural": "You're authentic and disarming. Your casual style and humor put people at ease, making even professional conversations feel like talking with a friend.",
    "The Professional": "You're polished and composed. Your articulate, well-structured communication commands respect and inspires confidence in your professionalism.",
    "The Storyteller": "You're expressive and engaging. Your narrative-driven style brings energy to conversations, painting vivid pictures that captivate and inspire action.",
    "The Minimalist": "You're efficient and no-nonsense. Your straightforward approach respects everyone's time and attention, delivering substance over small talk.",
    "The Balanced": "You're adaptable and versatile. Your communication style flexibly adjusts to different contexts and people, finding the right tone for each situation.",
  };

  return descriptions[archetype] || descriptions["The Balanced"];
}

/**
 * Generates tone guidance for AI message drafting based on the user's tone profile.
 * Used in the AI draft-message endpoint to influence Claude's writing style.
 */
export function generateToneGuidance(profile: ToneProfile): string {
  const parts: string[] = [];

  // Formality guidance
  if (profile.formality > 70) {
    parts.push("Use formal, professional language. Structure sentences carefully. Avoid contractions.");
  } else if (profile.formality > 50) {
    parts.push("Use a balanced, professional-but-friendly tone.");
  } else {
    parts.push("Use conversational, casual language. Contractions are okay. Feel natural.");
  }

  // Warmth guidance
  if (profile.warmth > 70) {
    parts.push("Emphasize genuine connection and empathy. Show you care about the recipient as a person.");
  } else if (profile.warmth > 50) {
    parts.push("Be friendly but professional. Show genuine interest without being overly familiar.");
  } else {
    parts.push("Keep emotional expression minimal. Focus on facts and value proposition.");
  }

  // Directness guidance
  if (profile.directness > 70) {
    parts.push("Get to the point quickly. Be clear about what you want. Avoid unnecessary elaboration.");
  } else if (profile.directness > 50) {
    parts.push("Balance directness with context. Explain your reasoning alongside your ask.");
  } else {
    parts.push("Lead with context and relationship-building. Build up to your ask naturally.");
  }

  // Energy guidance
  if (profile.energy > 70) {
    parts.push("Use active, dynamic language. Show enthusiasm and forward momentum.");
  } else if (profile.energy > 50) {
    parts.push("Use moderately energetic language. Show interest without being over-the-top.");
  } else {
    parts.push("Use calm, measured language. Avoid excessive exclamation marks or superlatives.");
  }

  // Humor guidance
  if (profile.humor > 70) {
    parts.push("Weave in light humor or wit where natural. Use a clever opening or callback to shared experience.");
  } else if (profile.humor > 40) {
    parts.push("A light touch of humor is fine, but keep it professional and relevant.");
  } else {
    parts.push("Avoid humor. Stick to straightforward, serious tone.");
  }

  return parts.join("\n");
}
