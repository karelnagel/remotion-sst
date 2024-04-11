/// <reference path="./.sst/platform/config.d.ts" />

import { RemotionLambda } from "./src";

export default $config({
  app: (input) => {
    return {
      name: "pulumi-remotion",
      removal: "remove",
      home: "aws",
      providers: {
        aws: { region: "eu-central-1" },
      },
    };
  },
  run: async () => {
    const remotion = new RemotionLambda("Remotion", {
      path: "remotion-example",
      forceDestroy: true,
    });
    new sst.aws.Astro("Client", {
      path: "client",
      link: [remotion],
    });
  },
});
