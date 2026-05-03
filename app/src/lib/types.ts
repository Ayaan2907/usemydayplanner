export interface BlockInput {
  blockId: string;
  start: string;
  end: string;
  title: string;
  note?: string;
  location: "desk" | "away";
  priority: "must" | "should" | "stretch";
  type: string;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}
