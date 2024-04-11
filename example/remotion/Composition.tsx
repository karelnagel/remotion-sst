import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";

export const myCompSchema = z.object({
  framework: z.string(),
  remotionPath: z.string().default("packages/remotion"),
});

const code = (framework: string, remotionPath: string) => `
import { RemotionLambda } from "remotion-sst";

const remotion = new RemotionLambda("Remotion", {
  path: "${remotionPath}",
});

new sst.aws.${framework}("Client", {
  path: "packages/client",
  link: [remotion],
});
`;

export const MyComposition: React.FC<z.infer<typeof myCompSchema>> = ({
  framework,
  remotionPath,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const text = code(framework, remotionPath);
  const char = interpolate(frame, [0, durationInFrames - 40], [0, text.length]);
  return (
    <AbsoluteFill className="items-center justify-center text-white">
      <code>{text.slice(0, char)}</code>
    </AbsoluteFill>
  );
};
