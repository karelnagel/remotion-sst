# Remotion SST

The easiest way to deploy Remotion Lambda to AWS with SST/Pulumi and use in your applications.

## Installation

```
npm install remotion-sst
```

## Usage

See the [example](./example) (deployed [here](https://remotion-sst.asius.ai/)), or the [standalone example](https://github.com/karelnagel/remotion-sst-example) (another repo without all the library code)

```ts
// sst.config.ts
const remotion = new RemotionLambda("Remotion", {
  path: "packages/remotion",
});
new sst.aws.Astro("Client", {
  path: "packages/client",
  link: [remotion],
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

## Contact

If you need assistance with creating Remotion videos or web development, I also offer contract work. Feel free to reach out to me at [karel@asius.ai](mailto:karel@asius.ai) for any inquiries or help you might need.
