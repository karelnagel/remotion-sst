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
      environment: {
        REMOTION_FUNCTION_NAME: remotion.function.name,
        REMOTION_SITE_URL: remotion.siteUrl,
        REMOTION_BUCKET_NAME: remotion.bucket.bucket,
        // Todo: don't use admin aws keys
        REMOTION_AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
        REMOTION_AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  },
});
