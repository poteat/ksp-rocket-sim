import { applyDerivative } from "./util";
import { StateFunction, StepSize, StateDerivative } from "./types";

import { ButcherTableu, ButcherTableuCodec } from "./metatypes/ButcherTableu";
import { isLeft } from "fp-ts/lib/Either";

export const genericRungeKutta = (table: ButcherTableu) => {
  if (isLeft(ButcherTableuCodec.decode(table))) {
    throw "Butcher tableu not of valid dimensions";
  }

  return <T>(f: StateFunction<T>, h: StepSize) => (x: T, t: number): T => {
    const { newState: y1, derivative: k1 } = f(x, t);

    const derivatives: StateDerivative<T>[] = [k1];

    for (let i = 1; i < table.timeOffsets.length; i++) {
      const timeOffset = table.timeOffsets[i];
      const weights = table.weights[i];

      const derivMulInput = weights
        .map((w, i) => ({
          dx: derivatives[i],
          mul: w
        }))
        .filter(x => x.mul !== 0);

      derivatives.push(
        f(applyDerivative(y1, h, ...derivMulInput), t + timeOffset * h)
          .derivative
      );
    }

    const result = applyDerivative(
      y1,
      h,
      ...table.finalWeights.map((w, i) => ({ dx: derivatives[i], mul: w }))
    );

    return result;
  };
};
