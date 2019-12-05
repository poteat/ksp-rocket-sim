import _ from "lodash";
import { writeFileSync } from "fs";

import { StateFunction } from "../engine/types";
import { threeEighthsRule } from "../engine/methods/threeEighthsRule";
import { runSimulation } from "../engine/runSimulation";

type BouncingBallState = {
  yPos: number;
  yVel: number;
  numBounces: number;
};

const bouncingBallEquation: StateFunction<BouncingBallState> = ({
  yPos,
  yVel,
  numBounces
}) => {
  const hasHitGround = yPos < 0;
  const gravity = -9.81;

  const newVel = hasHitGround ? Math.abs(yVel) * 0.9 : yVel;

  return {
    newState: hasHitGround
      ? { yPos: 0, yVel: newVel, numBounces: numBounces + 1 }
      : { yPos, yVel, numBounces },
    derivative: { yPos: newVel, yVel: gravity }
  };
};

const { statePath } = runSimulation({
  stateFunction: bouncingBallEquation,
  stepSize: 0.01,
  endTime: 10,
  method: threeEighthsRule,
  initState: {
    yPos: 10,
    yVel: 0,
    numBounces: 0
  }
});

const serialized = statePath.map(x => _.map(x).join(", ")).join("\n");

console.log(serialized);

writeFileSync("./data/simResult.csv", serialized);
