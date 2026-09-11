export interface Employer {
  id: string;
  name: string;
  hourlyRate: number;
  payType: "hourly" | "daily" | "base+overtime";
  color: string;
}

export interface TimeEntry {
  id: string;
  employerId: string;
  startTime: number; // epoch ms
  endTime: number | null; // null while clocked in
  note?: string;
}
