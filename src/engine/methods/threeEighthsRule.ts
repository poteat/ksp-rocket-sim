import { genericRungeKutta } from "../genericRungeKutta";

export const threeEighthsRule = genericRungeKutta({
  timeOffsets: [0, 1 / 3, 2 / 3, 1],
  weights: [[], [1 / 3], [-1 / 3, 1], [1, -1, 1]],
  finalWeights: [1 / 8, 3 / 8, 3 / 8, 1 / 8]
});
