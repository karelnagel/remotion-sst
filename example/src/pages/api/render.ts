import type { APIRoute } from "astro";
import { renderMediaOnLambda } from "@remotion/lambda/client";
import { Resource } from "sst";
import { DURATION_IN_FRAMES } from "../../../remotion/Root";

const MAX_LAMBDAS = 4;

export const POST: APIRoute = async (Astro) => {
  const res = await renderMediaOnLambda({
    functionName: Resource.Remotion.functionName,
    serveUrl: Resource.Remotion.siteUrl,
    forceBucketName: Resource.Remotion.bucketName,
    composition: "MyComp",
    codec: "h264",
    region: Resource.Remotion.region as any,
    inputProps: await Astro.request.json(),
    // To avoid hitting AWS concurrency limit on new accounts https://www.remotion.dev/docs/lambda/troubleshooting/rate-limit#exception-new-accounts-using-aws-lambda
    framesPerLambda: DURATION_IN_FRAMES / MAX_LAMBDAS,
  });
  return new Response(JSON.stringify({ renderId: res.renderId }), {
    headers: { "Content-Type": "application/json" },
  });
};
