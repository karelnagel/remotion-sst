import type { APIRoute } from "astro";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { Resource } from "sst";
import { DURATION_IN_FRAMES } from "../../../remotion/Root";

const MAX_LAMBDAS = 4;

export const POST: APIRoute = async () => {
  const res = await renderMediaOnLambda({
    functionName: Resource.Remotion.functionName,
    serveUrl: Resource.Remotion.siteUrl,
    forceBucketName: Resource.Remotion.bucketName,
    composition: "MyComp",
    codec: "h264",
    region: Resource.Remotion.region as any,

    // To avoid hitting AWS concurrency limit on new accounts https://www.remotion.dev/docs/lambda/troubleshooting/rate-limit#exception-new-accounts-using-aws-lambda
    framesPerLambda: DURATION_IN_FRAMES / MAX_LAMBDAS,
  });

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const progress = await getRenderProgress({
      renderId: res.renderId,
      bucketName: Resource.Remotion.bucketName,
      functionName: Resource.Remotion.functionName,
      region: Resource.Remotion.region as any,
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
