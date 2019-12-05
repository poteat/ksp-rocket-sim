# KSP Rocket Simulation

### System State

It is usual practice in mathematical physics to formalize the state of a system as a vector of real numbers.  Practically, this leads to speedups and conceptual simplifications as it allows the entire system to be described using analogies from linear algebra.  However, not all systems are linear, and the most interesting and realistic systems are only partially defined, non-continuous and non-linear.

Here we define state in terms of a mixture of discrete and continuous attributes, and such that the system can behave smoothly or discontinuously depending on conditions present in the equation.

Furthermore, we allow the system state to consist of an arbitrary object, where each attribute may be numbers, strings, booleans, or even subobjects or functions:

```ts
type State = {
  name: string,
  position: {
    x: number,
    y: number
  },
  velocity: {
    x: number,
    y: number
  },
  alive: boolean
}
```

### State-Space Representation

Because we're not only representing numbers, we need a new vehicle to represent changes to state.  The way we do this is by redefining the state space equation to a function which returns both new discrete values and the instantaneous change of the system:

```ts
type StateChange<T> = {
  discreteUpdates: RecursivePartial<T, never>;
  derivative: RecursivePartial<T, number>;
};
```

The `discreteUpdates` attribute describes what discrete changes occured during that time period, and is of recursive partial type of State, while the `derivative` attribute is a recursive partial of only the "leaf" attributes with number type. 

It's up to the numerical method to detect and handle discrete updates.


