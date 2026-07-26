export interface InteractState {
  stickers: Sticker[];
  likes: number;
  checkInToday: boolean;
}

export interface Sticker {
  id: string;
  emoji: string;
  label: string;
}