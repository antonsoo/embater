import { type CountTrial, countMeasureCsv } from "../src/core/count-measure";
import { countMeasureSvg } from "../src/draw/count-measure";

for (const flank of [11, 12, 13, 14, 15, 16, 17])
  for (const frontPitch of [1.25, 2.55, 6])
    for (const flankPitch of [1.25, 1.275, 6])
      for (const margin of [0, 0.75, 2])
        for (const edge of ["axes", "faces", "platform"] as const) {
          const trial: CountTrial = {
            basis: "record",
            equal: false,
            frontPitch,
            flankPitch,
            margin,
            edge,
          };
          process.stdout.write(
            `${JSON.stringify({ flank, trial, svg: countMeasureSvg(flank, trial), csv: countMeasureCsv(flank, trial) })}\n`,
          );
        }
