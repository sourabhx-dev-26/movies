export type Movie = {
  id: string;
  title: string;
  watchUrl: string;
  driveFileId: string;
  published: number;
  createdAt: number;
  updatedAt: number;
};
export type Stats = {
  today: number;
  total: number;
  average: number;
  days: number;
  daily: { day: string; visits: number }[];
};
