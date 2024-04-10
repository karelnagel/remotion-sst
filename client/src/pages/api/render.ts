import type { APIRoute } from "astro";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

export const POST: APIRoute = async () => {
  const functionName = import.meta.env.REMOTION_FUNCTION_NAME;
  const bucketName = import.meta.env.REMOTION_BUCKET_NAME;
  const serveUrl = import.meta.env.REMOTION_SITE_URL;

  console.log({ functionName, serveUrl, bucketName });
  const res = await renderMediaOnLambda({
    functionName,
    serveUrl,
    composition: "HelloWorld",
    codec: "h264",
    privacy: "no-acl",
    region: "eu-central-1",
    forceBucketName: bucketName,
  });

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const progress = await getRenderProgress({
      renderId: res.renderId,
      bucketName,
      functionName,
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
