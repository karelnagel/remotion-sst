import type { APIRoute } from "astro";
import { getRenderProgress } from "@remotion/lambda/client";
import { Resource } from "sst";

export const GET: APIRoute = async (Astro) => {
  const renderId = Astro.url.searchParams.get("renderId");
  if (!renderId) return new Response("No renderId", { status: 400 });

  const progress = await getRenderProgress({
    renderId: renderId,
    bucketName: Resource.Remotion.bucketName,
    functionName: Resource.Remotion.functionName,
    region: Resource.Remotion.region as any,
  });

  return new Response(JSON.stringify(progress), {
    headers: { "Content-Type": "application/json" },
  });
};
