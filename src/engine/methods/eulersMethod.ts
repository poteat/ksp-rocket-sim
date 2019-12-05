import { genericRungeKutta } from "../genericRungeKutta";

export const eulersMethod = genericRungeKutta({
  timeOffsets: [0],
  weights: [[]],
  finalWeights: [1]
});
