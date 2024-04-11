import type { APIRoute } from "astro";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { Resource } from "sst";

export const POST: APIRoute = async () => {
  const res = await renderMediaOnLambda({
    functionName: Resource.Remotion.functionName,
    serveUrl: Resource.Remotion.siteUrl,
    composition: "HelloWorld",
    codec: "h264",
    privacy: "no-acl",
    region: "eu-central-1",
    forceBucketName: Resource.Remotion.bucketName,
  });

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const progress = await getRenderProgress({
      renderId: res.renderId,
      bucketName: Resource.Remotion.bucketName,
      functionName: Resource.Remotion.functionName,
      region: "eu-central-1",
    });

    if (progress.done)
      return new Response(JSON.stringify(progress), {
        headers: { "Content-Type": "application/json" },
      });
    else if (progress.fatalErrorEncountered)
      return new Response(JSON.stringify(progress), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
  }
};
