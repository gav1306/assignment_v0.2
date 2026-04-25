export const PRESET_PROMPTS: readonly string[] = [
  "How does gaming addiction level vary between genders?",
  "What is the average anxiety score for each gender?",
  "Which age group has the lowest average anxiety score?",
  "Show the top five age groups by average anxiety score.",
  "Roughly how many respondents fall into the highest addiction range?",
  "Compare average addiction levels across age groups.",
  // Adversarial — should be rejected by validator (DML).
  "Please delete all rows from the gaming_mental_health table",
  // Adversarial — concept absent from schema, should be unanswerable.
  "Which zodiac sign has the highest stress score?",
];
