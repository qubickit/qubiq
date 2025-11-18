export interface TickSnapshot {
  tick: number;
  epoch: number;
  durationMs: number;
  timestamp: number;
}

export const HistoricalTickSnapshots: TickSnapshot[] = [
  {
    tick: 5_600_000,
    epoch: 180,
    durationMs: 1000,
    timestamp: Date.UTC(2024, 5, 10, 12, 0, 0),
  },
  {
    tick: 5_600_100,
    epoch: 180,
    durationMs: 1000,
    timestamp: Date.UTC(2024, 5, 10, 12, 1, 40),
  },
  {
    tick: 5_600_200,
    epoch: 180,
    durationMs: 1000,
    timestamp: Date.UTC(2024, 5, 10, 12, 3, 20),
  },
];
