import { AbsoluteFill } from "remotion";
import { Logo } from "./Logo";
import { Subtitle } from "./Subtitle";
import { Title } from "./Title";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const myCompSchema = z.object({
  titleText: z.string(),
  titleColor: zColor(),
  logoColor: zColor(),
});

export const MyComposition: React.FC<z.infer<typeof myCompSchema>> = ({
  titleText: propOne,
  titleColor: propTwo,
  logoColor: propThree,
}) => {
  return (
    <AbsoluteFill className="items-center justify-center bg-gray-100">
      <div className="m-10" />
      <Logo logoColor={propThree} />
      <div className="m-3" />
      <Title titleText={propOne} titleColor={propTwo} />
      <Subtitle />
    </AbsoluteFill>
  );
};
