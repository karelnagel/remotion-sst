/// <reference path="./.sst/platform/config.d.ts" />

import { RemotionLambda } from "./src";

export default $config({
  app: (input) => {
    return {
      name: "pulumi-remotion-lambda",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "eu-central-1" },
      },
    };
  },
  run: async () => {
    new RemotionLambda("Remotion", {
      function: {
        ephemerealStorageInMb: 2048,
        memorySizeInMb: 2048,
        timeoutInSeconds: 120,
      },
      site:{
        bundlePath:""
      }
    });
  },
});
