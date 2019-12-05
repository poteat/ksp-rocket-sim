import { genericRungeKutta } from "../genericRungeKutta";

export const threeEighthsRule = genericRungeKutta({
  timeOffsets: [0, 1 / 2],
  weights: [[], [1 / 2]],
  finalWeights: [0, 1]
});
