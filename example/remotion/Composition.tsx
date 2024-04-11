import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const myCompSchema = z.object({
  framework: z.string(),
  color: zColor(),
});

export const MyComposition: React.FC<z.infer<typeof myCompSchema>> = ({ framework, color }) => {
  return (
    <AbsoluteFill
      className="items-center justify-center bg-gray-100 text-white"
      style={{ backgroundColor: color }}
    >
      <h1 className="text-8xl font-bold">{framework}</h1>
    </AbsoluteFill>
  );
};
