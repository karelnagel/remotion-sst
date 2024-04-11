# Pulumi Remotion Lambda

The easiest way to deploy Remotion Lambda to SST and use in your applications.

## Installation

```
npm install pulumi-remotion-lambda
```

## Usage 

```ts
// sst.config.ts
const remotion = new RemotionLambda("Remotion", {
    path: "remotion-example",
});
new sst.aws.Astro("Client", {
    path: "client",
    link: [remotion]
});
```

```ts
// render.ts
import { Resource } from "sst";

const res = await renderMediaOnLambda({
    functionName: Resource.Remotion.functionName,
    serveUrl: Resource.Remotion.siteUrl,
    forceBucketName: Resource.Remotion.bucketName,
    region: Resource.Remotion.region,
    composition: "HelloWorld",
    codec: "h264",
});
```