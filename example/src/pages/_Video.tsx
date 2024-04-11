import { useState } from "react";
import axios from "axios";
import type { RenderProgress } from "@remotion/lambda/client";
import { Player } from "@remotion/player";
import { MyComposition, Theme } from "../../remotion/Composition";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "../../remotion/Root";
import { Sparkles } from "lucide-react";

const FRAMEWORKS = ["Astro", "Nextjs", "Remix", "SolidStart", "StaticSite"];

const render = async (data: { framework: string; theme: Theme }) => {
  const res = await axios.post<{ renderId: string }>("/api/render", data);
  return res.data.renderId;
};

const getProgress = async (renderId: string) => {
  const res = await axios.get<RenderProgress>(`/api/progress?renderId=${renderId}`);
  return res.data;
};

export const Video = () => {
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const [theme, setTheme] = useState<Theme>(Theme.options[0]);
  const [status, setStatus] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setStatus("rendering");
    const renderId = await render({ framework, theme });

    const interval = setInterval(async () => {
      const progress = await getProgress(renderId);
      if (progress.fatalErrorEncountered) {
        setStatus("error");
        clearInterval(interval);
      } else if (progress.done) {
        setUrl(progress.outputFile);
        setStatus("done");
        clearInterval(interval);
      }
      setProgress(progress.overallProgress);
    }, 3000);
  };
  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 ">
        {progress !== null && (
          <progress
            value={progress}
            className="h-1 w-full rounded-full bg-gray-200 text-red-500"
            max={1}
          />
        )}
        <Player
          style={{ width: "100%" }}
          component={MyComposition}
          compositionHeight={HEIGHT}
          compositionWidth={WIDTH}
          durationInFrames={DURATION_IN_FRAMES}
          fps={FPS}
          inputProps={{ framework, theme }}
          controls
          loop
          autoPlay
        />
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            Your prefered framework
            <select
              value={framework}
              className="rounded-md border bg-transparent p-2 px-4"
              onChange={(e) => setFramework(e.target.value)}
            >
              {FRAMEWORKS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Select theme
            <select
              className="h-full w-full rounded-md border bg-transparent p-2 px-4"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {Theme.options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="flex items-center justify-center gap-2 rounded-md bg-blue-500 p-2 px-4 text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "rendering"}
        >
          <Sparkles />
          {status === "rendering" ? "Rendering..." : "Render Video"}
        </button>

        {status === "done" && url && (
          <a target="_blank" className="text-blue-500 underline" href={url}>
            Open Rendered Video
          </a>
        )}
        {status === "error" && <div className="text-red-500">Error</div>}
      </form>
    </div>
  );
};
