import type { APIRoute } from "astro";
import { renderMediaOnLambda } from "@remotion/lambda/client";

export const POST: APIRoute = async () => {
  console.log(import.meta.env.REMOTION_FUNCTION_NAME, import.meta.env.REMOTION_SITE_URL);
  const res = await renderMediaOnLambda({
    functionName: import.meta.env.REMOTION_FUNCTION_NAME,
    serveUrl: import.meta.env.REMOTION_SITE_URL,
    composition: "HelloWorld",
    codec: "h264",
    region: "eu-central-1",
  });
  return new Response(JSON.stringify(res), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
