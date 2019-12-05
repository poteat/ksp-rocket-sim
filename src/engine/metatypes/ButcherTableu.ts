/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as t from "io-ts";
import _ from "lodash";

interface ButcherTableuBrand {
  readonly ButcherTableu: unique symbol;
}

const __ButcherTableuBase = t.type({
  timeOffsets: t.array(t.number),
  weights: t.array(t.array(t.number)),
  finalWeights: t.array(t.number)
});

export const ButcherTableuCodec = t.brand(
  __ButcherTableuBase,
  (
    x: t.TypeOf<typeof __ButcherTableuBase>
  ): x is t.Branded<t.TypeOf<typeof __ButcherTableuBase>, ButcherTableuBrand> =>
    x.timeOffsets.length === x.weights.length &&
    x.timeOffsets.length === x.finalWeights.length &&
    _.every(x.weights, (w, i) => w.length === i),
  "ButcherTableu"
);

export type ButcherTableu = t.TypeOf<typeof __ButcherTableuBase>;
