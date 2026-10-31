import { addItem } from "@/server/categories-service";
import { errorResponse, readBody } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  const parsed = await readBody(request, { required: ["name"] });
  if ("response" in parsed) return parsed.response;
  try {
    const { id } = await params;
    return Response.json(
      { item: addItem(id, parsed.body.name) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
