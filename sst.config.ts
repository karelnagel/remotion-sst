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
    const remotion = new RemotionLambda("Remotion", {
      function: {
        ephemerealStorageInMb: 2048,
        memorySizeInMb: 2048,
        timeoutInSeconds: 120,
      },
      site: {
        bundlePath: "/Users/karel/Documents/pulumi-remotion-lambda/remotion-example/build",
      },
    });
    new sst.aws.Astro("Client", {
      path: "client",
      environment: {
        REMOTION_FUNCTION_NAME: remotion.function.name,
        REMOTION_SITE_URL: remotion.siteUrl,
      },
    });
  },
});
