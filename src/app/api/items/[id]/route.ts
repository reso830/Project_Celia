import { renameItem } from "@/server/categories-service";
import { errorResponse, readBody } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const parsed = await readBody(request, { required: ["name"] });
  if ("response" in parsed) return parsed.response;
  try {
    const { id } = await params;
    return Response.json({ item: renameItem(id, parsed.body.name) });
  } catch (error) {
    return errorResponse(error);
  }
}
