import { NextRequest } from "next/server";
import { route } from "@fal-ai/serverless-proxy/nextjs";

export const POST = async (request: NextRequest) => {
    return route.POST(request);
}
 
export const { GET } = route;
