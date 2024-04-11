import { Composition } from "remotion";
import { MyComposition, myCompSchema } from "./Composition";
import "../styles.css";

export const FPS = 30;
export const DURATION_IN_FRAMES = 240;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1280}
        height={720}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion with Tailwind CSS",
          titleColor: "#000000",
          logoColor: "#00bfff",
        }}
      />
    </>
  );
};
