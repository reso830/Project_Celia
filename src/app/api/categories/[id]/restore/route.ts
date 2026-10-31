import { restoreCategory } from "@/server/categories-service";
import { errorResponse, readBody } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const parsed = await readBody(request, {});
  if ("response" in parsed) return parsed.response;
  try {
    const { id } = await params;
    return Response.json({ category: restoreCategory(id) });
  } catch (error) {
    return errorResponse(error);
  }
}
