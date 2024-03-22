# Pulumi Remotion Lambda

Easy to deploy Remotion Lambda with Pulumi/SST in a few lines of code and after use that with a client.

## Usage 

```ts
const remotion = new RemotionLambda("Remotion", {
    path: "remotion-example",
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
    },
});
```