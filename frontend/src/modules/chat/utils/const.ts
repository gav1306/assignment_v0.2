export const SAMPLE_FOLLOWUPS: readonly string[] = [
  "What is the addiction level distribution by gender?",
  "What about males specifically?",
  "Can you sort by anxiety score instead?",
  "Now show only respondents under 25.",
];

export const CHAT_API_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api") + "/chat";

export const THINKING_DOT_STAGGER_MS = 120;

