import { errorResponse, readBody } from "@/server/http";
import { duplicateBudgetModel } from "@/server/models-service";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await readBody(request, { optional: ["name", "description"] });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json(
      { model: duplicateBudgetModel((await context.params).id, parsed.body) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
