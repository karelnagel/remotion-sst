/// <reference path="./.sst/platform/config.d.ts" />

import { RemotionLambda } from "./src";

export default $config({
  app: (input) => {
    return {
      name: "remotion-sst",
      removal: "remove",
      home: "aws",
      providers: {
        aws: { region: "eu-central-1" },
      },
    };
  },
  run: async () => {
    const remotion = new RemotionLambda("Remotion", {
      path: "example",
      forceDestroy: true,
    });
    new sst.aws.Astro("Example", {
      path: "example",
      link: [remotion],
    });
  },
});
