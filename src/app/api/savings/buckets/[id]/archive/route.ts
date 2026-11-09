import { errorResponse, readBody } from "@/server/http";
import { archiveSavingsBucket } from "@/server/savings-service";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await readBody(request, {});
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json({
      bucket: archiveSavingsBucket((await context.params).id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
