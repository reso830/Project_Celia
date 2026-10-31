import { updateCategory } from "@/server/categories-service";
import { DomainError } from "@/domain/errors";
import { errorResponse, readBody } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const parsed = await readBody(request, { optional: ["name", "color"] });
  if ("response" in parsed) return parsed.response;
  if (!Object.keys(parsed.body).length)
    return errorResponse(
      new DomainError("validation", "Provide a name or colour."),
    );
  try {
    const { id } = await params;
    return Response.json({ category: updateCategory(id, parsed.body) });
  } catch (error) {
    return errorResponse(error);
  }
}
