export type Time = number;

export type StepSize = number;

export type RecursivePartial<T, N> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U, N>[]
    : T[P] extends object
    ? RecursivePartial<T[P], N>
    : N extends never
    ? T[P]
    : N;
};

export type StateDerivative<T> = RecursivePartial<T, number>;

export type StateChange<T> = {
  newState: T;
  derivative: StateDerivative<T>;
};

export type StateFunction<T> = (x: T, t?: Time) => StateChange<T>;

export type NumericalMethod<T> = <T>(
  f: StateFunction<T>,
  h: number
) => (x: T, t: number) => T;
