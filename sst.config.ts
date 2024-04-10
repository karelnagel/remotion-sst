/// <reference path="./.sst/platform/config.d.ts" />

import { RemotionLambda, permissions } from "./src";

export default $config({
  app: (input) => {
    return {
      name: "pulumi-remotion",
      removal: input?.stage === "production" ? "retain" : "remove",
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
      function: {
        ephemerealStorageInMb: 2048,
        memorySizeInMb: 2048,
        timeoutInSeconds: 120,
      },
    });
    new sst.aws.Astro("Client", {
      path: "client",
      permissions,
      environment: {
        REMOTION_FUNCTION_NAME: remotion.function.name,
        REMOTION_SITE_URL: remotion.siteUrl,
        REMOTION_BUCKET_NAME: remotion.bucket.bucket,
      },
    });
  },
});
