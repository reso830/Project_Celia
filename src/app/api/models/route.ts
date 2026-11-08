import { errorResponse, readBody } from "@/server/http";
import { createBudgetModel } from "@/server/models-service";
export async function POST(request: Request) {
  const parsed = await readBody(request, {
    required: ["name"],
    optional: ["description"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json(
      { model: createBudgetModel({ ...parsed.body, name: parsed.body.name }) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
