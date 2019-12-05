import { genericRungeKutta } from "../genericRungeKutta";

export const classicRungeKutta = genericRungeKutta({
  timeOffsets: [0, 1 / 2, 1 / 2, 1],
  weights: [[], [1 / 2], [0, 1 / 2], [0, 0, 1]],
  finalWeights: [1 / 6, 1 / 3, 1 / 3, 1 / 6]
});
