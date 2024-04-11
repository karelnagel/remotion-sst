import { Composition } from "remotion";
import { MyComposition, Theme, myCompSchema } from "./Composition";
import "../styles.css";

export const FPS = 30;
export const DURATION_IN_FRAMES = 180;
export const HEIGHT = 720;
export const WIDTH = 1280;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={myCompSchema}
        defaultProps={{
          theme: Theme.options[0],
          framework: "Astro",
        }}
      />
    </>
  );
};
