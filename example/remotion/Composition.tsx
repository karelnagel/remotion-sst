import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { useEffect, useState } from "react";
import { HEIGHT, WIDTH } from "./Root";
import { getHighlighterCore, type HighlighterCore } from "shiki/core";
import loadWasm from "shiki/wasm";
import nord from "shiki/themes/nord.mjs";
import ts from "shiki/langs/typescript.mjs";

const highlighterPromise = getHighlighterCore({
  themes: [nord],
  langs: [ts],
  loadWasm,
});

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
  const [highlighter, setHighlighter] = useState<HighlighterCore>();
  useEffect(() => {
    highlighterPromise.then(setHighlighter);
  }, []);
  return (
    <AbsoluteFill className="items-center justify-center text-white">
      {highlighter && (
        <div
          style={{ width: WIDTH, height: HEIGHT }}
          className="h-full w-full text-4xl"
          dangerouslySetInnerHTML={{
            __html: highlighter.codeToHtml(
              text.slice(0, char) + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
              { lang: "ts", theme: "nord" },
            ),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
