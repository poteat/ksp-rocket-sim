import { linterp } from "../../../engine/util";

/**
 * Linear control points approximating atmosphere curve. Control points are
 * represented in Pascals, but the other equations use atmosphere units.
 */
const atmospherePressureCurve = [
  [0, 101325],
  [2500, 69015],
  [5000, 45625],
  [7500, 29126],
  [10000, 17934],
  [15000, 6726],
  [20000, 2549],
  [25000, 993.6],
  [30000, 404.1],
  [40000, 79.77],
  [50000, 15.56],
  [60000, 2.387],
  [70000, 0]
] as const;

export const heightToPressure = (height: number) =>
  (linterp(atmospherePressureCurve)(height) as number) * 0.000009869233;

const atmosphereDensityCurve = [
  [0, 1.225],
  [2500, 0.898],
  [5000, 0.642],
  [7500, 0.446],
  [10000, 0.288],
  [15000, 0.108],
  [20000, 0.04],
  [25000, 0.015],
  [30000, 0.006],
  [40000, 0.001],
  [50000, 0],
  [60000, 0],
  [70000, 0]
] as const;

export const heightToDensity = linterp(atmosphereDensityCurve);
