import _ from "lodash";
import { writeFileSync } from "fs";

import { StateFunction } from "../../engine/types";
import { classicRungeKutta } from "../../engine/methods/classicRungeKutta";
import { runSimulation } from "../../engine/runSimulation";
import { heightToPressure, heightToDensity } from "./data/atmosphere";
import { NaNGuard } from "../../engine/util";

const environmentalConstants = {
  planet: {
    name: "Kerbin",
    radius: 6e5, // m, equatorial
    standardGravitationalParameter: 3.5316e12, // m^3 / s^3
    siderealVelocity: 174.94, // m/s
    dragConstant: 9.784758844e-4,
    atmosphereMaxHeight: 70e3
  }
};

type Position = {
  x: number;
  y: number;
};

type Velocity = {
  vx: number;
  vy: number;
};

type Mass = {
  m: number;
};

type ControlMode =
  | "Vertical Ascent"
  | "Gravity Turn"
  | "Coasting Period"
  | "Circularization Burn";

type Control = {
  stageIndex: number;
  controlMode: ControlMode;
};

type PhyState = Position & Velocity & Mass & Control;

/** The force of gravity is a directional force towards the center of the
 * planet, with magnitude inverse-cubedly correlated with the distance from
 * the center of the planet.
 */
const gravityEquation = ({ x, y }: Position) => {
  const S = environmentalConstants.planet.standardGravitationalParameter;
  const distly = (x * x + y * y) ** (3 / 2);

  return {
    ax: (-S / distly) * x,
    ay: (-S / distly) * y
  };
};

type ControlTrajectoryParameters = {
  turnInitialAltitude: number;
  turnFinalAltitude: number;
  turnShape: number;
  turnFinalAngle: number;
};

type Parameters = {
  controlTrajectory: ControlTrajectoryParameters;
  targetOrbitalHeight: number;
  stages: [
    {
      engines: {
        atmosphericThrust: number;
        vacuumThrust: number;
        atmosphericISP: number;
        vacuumISP: number;
      }[];
      initMass: number;
      dryMass: number;
    }
  ];
};

/** The force of drag is a directional force whose direction is a function of
 * "wind" and the velocity vector of the craft.  We model "wind" as having a
 * constant speed equal to and in the radial direction of the planet's rotation.
 * The direction is obtained from the wind vector subtracted by the craft's
 * velocity vector.
 */
const dragEquation = (
  { x, y, vx, vy }: Position & Velocity,
  height: number
) => {
  const RS = environmentalConstants.planet.siderealVelocity;
  const D = environmentalConstants.planet.dragConstant;

  const density = heightToDensity(height) as number;

  const positionTangent = Math.atan2(y, x) - Math.PI / 2;
  const fx = vx - Math.cos(positionTangent) * RS;
  const fy = vy - Math.sin(positionTangent) * RS;

  const fl = Math.sqrt(fx * fx + fy * fy);
  const fnormx = NaNGuard(fx / fl);
  const fnormy = NaNGuard(fy / fl);

  return {
    ax: -D * density * fnormx * fx,
    ay: -D * density * fnormy * fy
  };
};

/** Thrust over time is characterized by the control logic associated with the
 * simulation, as well as the stages and physical attributes of the craft.  If
 * we run out of fuel, we execute the next stage.  If no further stages are
 * present, thrust is disabled completely.
 *
 * The control trajectory is specified by four parameters, which control the
 * range and sharpness of the gravity turn.  This trajectory specification is
 * not "complete", in that it covers a relatively small subset of all input
 * trajectories, and it almost certainly does not cover the optimal trajectory
 * for a given craft.
 *
 * In the simulation, the craft will thrust along the control trajectory until
 * the estimated apoapsis is at the target orbital height. At that point, thrust
 * will be disabled until we reach the apoapsis, i.e. the craft will be in the
 * "coasting period".
 *
 * While in the coasting period, we expel a small amount of thrust (10%) as
 * necessary when our apoapsis dips below our target height.  This is because
 * we may still be in the atmosphere during the coasting period, which will
 * reduce our apoapsis.
 *
 * Before we reach our apoapsis, we'll be able to accurately calculate how much
 * time will be needed to execute the circularization burn, because we will be
 * out of the atmosphere.  We start the burn before we reach the apoapsis, with
 * a delta-time of half the circularization burn time.  We burn prograde for
 * the circularization, and then disable all thrust.
 */
const thrustEquation = (
  { x, y, vx, vy, m, stageIndex }: Position & Velocity & Mass & Control,
  height: number,
  {
    controlTrajectory: {
      turnInitialAltitude,
      turnFinalAltitude,
      turnShape,
      turnFinalAngle
    },
    stages
  }: Parameters,
  controlMode: ControlMode,
  targetOrbitalHeight: number
) => {
  let angle = 0;
  let throttle = 0;

  console.log(controlMode);

  if (controlMode === "Vertical Ascent") {
    throttle = 1;
    angle = Math.atan2(y, x);

    if (height >= turnInitialAltitude) {
      controlMode = "Gravity Turn";
    }
  } else if (controlMode === "Gravity Turn") {
    throttle = 1;
    angle =
      Math.atan2(y, x) +
      ((Math.PI / 2 -
        (height - turnInitialAltitude) /
          (turnFinalAltitude - turnInitialAltitude)) ^
        turnShape) *
        (Math.PI / 2 - turnFinalAngle) -
      Math.PI ** 2 / 4;

    // Transfer to coasting period if final altitude is reached or...
    if (height >= turnFinalAltitude) {
      controlMode = "Coasting Period";
    }

    // Transfer to coasting period if apoapsis becomes high enough
    const S = environmentalConstants.planet.standardGravitationalParameter;
    const R = environmentalConstants.planet.radius;

    const speed = Math.sqrt(vx ** 2 + vy ** 2);
    const distance = Math.sqrt(x ** 2 + y ** 2);

    const E = speed ** 2 / 2 - S / distance;
    const semiMajorAxis = -S / (2 * E);

    const angularMomentumX = vy * (x * vy - y * vx);
    const angularMomentumY = -vx * (x * vy - y * vx);

    const eccentricity = Math.sqrt(
      (angularMomentumX / S - x / distance) ** 2 +
        (angularMomentumY / S - y / distance) ** 2
    );

    const apoapsis = semiMajorAxis * (1 + eccentricity) - R;

    console.log(apoapsis);

    if (apoapsis > targetOrbitalHeight) {
      controlMode = "Coasting Period";
    }
  } else if (controlMode === "Coasting Period") {
    throttle = 0;
    angle = 0;
  } else if (controlMode === "Circularization Burn") {
    throttle = 0;
    angle = 0;
  }

  // If throttle is zero, skip the fancy atmospheric thrust computations
  if (throttle === 0) {
    return {
      thrustAccel: {
        ax: 0,
        ay: 0
      },
      controlMode
    };
  }

  const currentStage = stages[stageIndex];

  const pressure = heightToPressure(height);

  /** Add up thrust from all of the active engines in this stage. The thrust of
   * an engine is linearly dependent on local atmospheric pressure.
   */
  let sumThrust = 0;
  for (const engine of currentStage.engines) {
    const { atmosphericThrust: at, vacuumThrust: vt } = engine;
    const thrust = vt + (at - vt) * pressure;
    sumThrust += throttle * thrust;
  }

  return {
    thrustAccel: {
      ax: (sumThrust / m) * Math.cos(angle),
      ay: (sumThrust / m) * Math.sin(angle)
    },
    controlMode
  };
};

export const rocketStateEquation: (
  params: Parameters
) => StateFunction<PhyState> = ({
  controlTrajectory,
  targetOrbitalHeight,
  stages
}: Parameters) => ({ x, y, vx, vy, m, stageIndex, controlMode }: PhyState) => {
  const R = environmentalConstants.planet.radius;
  const height = Math.sqrt(x * x + y * y) - R;

  if (height < -0.05) {
    throw "Rocket has hit ground";
  }

  const gravityAccel = gravityEquation({ x, y });

  const dragAccel = dragEquation({ x, y, vx, vy }, height);

  const { thrustAccel, controlMode: newControlMode } = thrustEquation(
    { x, y, vx, vy, m, stageIndex, controlMode },
    height,
    {
      controlTrajectory,
      targetOrbitalHeight,
      stages
    },
    controlMode,
    targetOrbitalHeight
  );

  const ax = gravityAccel.ax + dragAccel.ax + thrustAccel.ax;
  const ay = gravityAccel.ay + dragAccel.ay + thrustAccel.ay;

  return {
    newState: {
      x,
      y,
      vx,
      vy,
      m,
      stageIndex,
      controlMode: newControlMode
    },
    derivative: {
      x: vx,
      y: vy,
      vx: ax,
      vy: ay,
      m: 0
    }
  };
};

const params: Parameters = {
  controlTrajectory: {
    turnInitialAltitude: 10e3,
    turnFinalAltitude: 45e3,
    turnShape: 0.3,
    turnFinalAngle: 0
  },
  targetOrbitalHeight: 70000,
  stages: [
    {
      engines: [
        {
          atmosphericThrust: 205.16,
          vacuumThrust: 240,
          atmosphericISP: 265,
          vacuumISP: 310
        }
      ],
      initMass: 3,
      dryMass: 3.5
    }
  ]
};

const { statePath, endingReason } = runSimulation({
  stateFunction: rocketStateEquation(params),
  stepSize: 1,
  endTime: 1000,
  method: classicRungeKutta,
  initState: {
    x: 0,
    y: environmentalConstants.planet.radius,
    vx: 174.94,
    vy: 0,
    m: params.stages[0].initMass,
    stageIndex: 0,
    controlMode: "Vertical Ascent" as const
  }
});

const serialized = statePath
  .map(x => _.map(x, x => (_.isNumber(x) ? x.toFixed(2) : x)).join(", "))
  .join("\n");

// console.log(serialized);
// console.log(endingReason);

writeFileSync("./data/simResult.csv", serialized);
