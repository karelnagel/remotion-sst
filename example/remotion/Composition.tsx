import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { useEffect, useState } from "react";
import { HEIGHT, WIDTH } from "./Root";
import { getHighlighterCore, type HighlighterCore } from "shiki/core";
import loadWasm from "shiki/wasm";
import ts from "shiki/langs/typescript.mjs";
import nord from "shiki/themes/nord.mjs";
import andromeeda from "shiki/themes/andromeeda.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import houston from "shiki/themes/houston.mjs";

const highlighterPromise = getHighlighterCore({
  themes: [nord, andromeeda, githubLight, houston],
  langs: [ts],
  loadWasm,
});

export const Theme = z.enum(["houston", "nord", "andromeeda", "github-light"]);
export type Theme = z.infer<typeof Theme>;

export const myCompSchema = z.object({
  framework: z.string(),
  theme: Theme,
});

const code = (framework: string) => `
import { RemotionLambda } from "remotion-sst";

const remotion = new RemotionLambda("Remotion", {
  path: "packages/remotion",
});

new sst.aws.${framework}("Client", {
  path: "packages/client",
  link: [remotion],
});
`;

export const MyComposition: React.FC<z.infer<typeof myCompSchema>> = ({ framework, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const text = code(framework);
  const char = interpolate(frame, [0, durationInFrames - 40], [0, text.length]);
  const [highlighter, setHighlighter] = useState<HighlighterCore>();
  useEffect(() => void highlighterPromise.then(setHighlighter), []);
  return (
    <AbsoluteFill className="items-center justify-center text-white">
      {highlighter && (
        <div
          style={{ width: WIDTH, height: HEIGHT }}
          className="h-full w-full text-4xl"
          dangerouslySetInnerHTML={{
            __html: highlighter.codeToHtml(
              text.slice(0, char) + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
              { lang: "ts", theme },
            ),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
