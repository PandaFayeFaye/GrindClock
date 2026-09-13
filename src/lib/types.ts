export type PayType = "hourly" | "daily" | "base+overtime" | "comprehensive" | "monthly" | "per-order";

export interface Employer {
  id: string;
  name: string;
  color: string;
  payType: PayType;
  currency?: string; // ISO-ish code, e.g. "CNY" | "USD" | "EUR" -- see lib/currency.ts; defaults to CNY
  industryTag?: string; // free-form or preset industry label, e.g. "Restaurant" -- display/filter only, no calculation impact
  hourlyRate?: number;
  dailyRate?: number;
  baseSalary?: number;
  monthlySalary?: number;
  pricePerOrder?: number;
  overtimeMultiplier?: number;
  holidayMultiplier?: number;
  breakMinutes?: number;
  settlementCycle?: "daily" | "weekly" | "monthly";
  commuteMinutes?: number;
  commuteCost?: number;
  idleTimePct?: number; // estimated % of on-shift time spent idle/waiting (e.g. between rideshare/delivery orders)
  defaultAdjustments?: Adjustment[]; // recurring per-shift bonus/deduction rules, auto-applied to every new entry
  note?: string;
}

export type Mood = "crash" | "normal" | "great" | "heartbeat";

export interface Adjustment {
  type: "bonus" | "deduction";
  amount: number;
  note?: string;
}

export interface TimeEntry {
  id: string;
  employerId: string;
  workerId?: string; // set when this entry belongs to a team-logged worker
  startTime: number; // epoch ms
  endTime: number | null; // null while clocked in
  status: "confirmed" | "draft";
  source: "manual" | "ocr" | "voice";
  mood?: Mood;
  moodNote?: string;
  adjustment?: Adjustment[];
  orderCount?: number; // only for per-order payType
  isOvertime?: boolean; // applies employer.overtimeMultiplier when computing pay
  isHoliday?: boolean; // applies employer.holidayMultiplier when computing pay
  note?: string;
  clockInLocation?: { lat: number; lng: number; accuracy: number };
}

export interface Worker {
  id: string;
  name: string;
  note?: string;
  defaultHourlyRate?: number;
}
