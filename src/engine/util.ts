import _ from "lodash";
import { Y } from "variadic-y";

import { StateDerivative, StepSize } from "./types";

type RecurseMap = (
  x: any,
  key: number | string,
  path: (string | number)[]
) => any;

export const mapObject = (obj: any, mapFunction: RecurseMap): any =>
  Y(
    (f: RecurseMap): RecurseMap => (x, key, path): any => {
      const newPath = key === "" ? path : [...path, key];
      if (_.isArray(x)) {
        return _.map(x, (x, k) => f(x, k, newPath));
      } else if (_.isObject(x)) {
        return _.mapValues(x, (x, k) => f(x, k, newPath));
      } else {
        return mapFunction(x, key, newPath);
      }
    }
  )(obj, "", []);

export const applyDerivative = <T>(
  x: T,
  h: StepSize,
  ...derivs: { dx: StateDerivative<T>; mul: number }[]
): T =>
  mapObject(x, (value, key, path) => {
    if (typeof value === "number") {
      let accumValue = value;
      for (const deriv of derivs) {
        const dx = ((x): number => (x === undefined ? 0 : x))(
          _.get(deriv.dx, path)
        );

        accumValue += h * dx * deriv.mul;
      }
      return accumValue;
    } else {
      return value;
    }
  });

export const NaNGuard = (x: number) => (Number.isNaN(x) ? 0 : x);

/** Linearly interpolate input parameter x given points array.  Each element of
 * the outer points array will be a 2-tuple where the first element is the
 * independent variable (i.e. x) and the second element is the dependent
 * variable (i.e. y)
 *
 * An unenforced precondition is that the points vector must be sorted with
 * respect to each element's independent variable (i.e. its x).
 */

type LinControlPoint = readonly [number, number];

type LinControlPointArray = readonly LinControlPoint[];

export const linterp = (points: LinControlPointArray) => (x: number) => {
  /** Since linear interpolation is often used for numerical codes, this
   * implementation is designed with speed in mind rather than conceptual
   * elegance.
   */

  /** Enforce precondition: points must have at least one element. We also
   * specify this precondition in the type-level.
   */
  if (points.length === 0) {
    return undefined;
  }

  /** If there's only one element, simply return the independent variable */
  if (points.length === 1) {
    return points[0][1];
  }

  /** If x is less than the first LinControlPoint independent variable, we
   * simply return the corresponding dependent variable value.
   */
  if (x <= points[0][0]) {
    return points[0][1];
  }

  /**
   * Loop through points to find the two control points between which x exists.
   * This could be replaced by a binary search mechanism.
   */
  let foundIndex = undefined;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (x >= p1[0] && x <= p2[0]) {
      foundIndex = i;
      break;
    }
  }

  /** If there is no index found, it is implied that the number exists beyond
   * the interpolated range, so we return the dependent variable value of the
   * last point.
   */
  if (foundIndex === undefined) {
    return points[points.length - 1][1];
  }

  const p1 = points[foundIndex];
  const p2 = points[foundIndex + 1];

  const t = (x - p1[0]) / (p2[0] - p1[0]);

  const y = p1[1] + t * (p2[1] - p1[1]);

  return y;
};
