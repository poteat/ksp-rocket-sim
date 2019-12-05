import _ from "lodash";

import { StateFunction, StepSize, Time, NumericalMethod } from "./types";

export type RunSimulationParameters<T> = {
  method: NumericalMethod<T>;
  stateFunction: StateFunction<T>;
  stepSize: StepSize;
  endTime: Time;
  initState: T;
};

export const runSimulation = <T>({
  stateFunction,
  stepSize,
  endTime,
  initState,
  method
}: RunSimulationParameters<T>) => {
  const statePath: ({ t: Time } & T)[] = [];
  let event = undefined;

  try {
    _.times(endTime / stepSize).reduce(
      ({ state, t }) => {
        statePath.push({ t, ...state });
        return {
          state: method(stateFunction, stepSize)(state, t),
          t: t + stepSize
        };
      },
      { state: initState, t: 0 }
    );
  } catch (_event) {
    event = _event;
  }

  return {
    statePath,
    endingReason: event ? event : "Simulation end time reached."
  };
};
