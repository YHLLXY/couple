export interface CalendarDay {
  date: string;
  hasWishes: boolean;
  bothCheckedIn: boolean;
  hasAnniversary: boolean;
  hasDiary: boolean;
}

export interface Anniversary {
  id: string;
  title: string;
  date: string;
  icon?: string;
  isRepeating: boolean;
}