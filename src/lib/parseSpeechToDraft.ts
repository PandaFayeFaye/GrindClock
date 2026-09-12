import type { Employer } from "./types";

export interface ParsedDraft {
  employerId?: string;
  hours?: number;
  minutes?: number;
  rawText: string;
}

/**
 * Best-effort, regex-based extraction from OCR/speech text -- NOT a real language
 * model. No API key is configured for this project (see PRD open questions), so
 * this free heuristic parser is the honest MVP: it catches "6小时"/"6.5个小时"-style
 * phrasing and matches an employer name by substring. Users always get to review
 * and correct the result before saving (see AICapturePage), so a wrong guess here
 * costs a few taps, not a bad record.
 */
export function parseSpeechToDraft(text: string, employers: Employer[]): ParsedDraft {
  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:个)?小时/);
  const minutesMatch = text.match(/(\d+)\s*分钟/);

  const employer = employers.find((e) => text.includes(e.name));

  return {
    employerId: employer?.id,
    hours: hoursMatch ? Number(hoursMatch[1]) : undefined,
    minutes: minutesMatch ? Number(minutesMatch[1]) : undefined,
    rawText: text,
  };
}
