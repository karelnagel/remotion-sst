# Pulumi Remotion Lambda

Easy to deploy Remotion Lambda with Pulumi/SST in a few lines of code and after use that with a client.

## Usage 

```ts
const remotion = new RemotionLambda("Remotion", {
    path: "remotion-example",
});
new sst.aws.Astro("Client", {
    path: "client",
    link: [remotion]
});
```

## Todo
- custom domains for lambda, like SST does for every FE stack
- everything in bucket is public
- the first deploy fails rn bc bucket isn't ready yet, so you need to run deploy twice at first