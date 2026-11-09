import { errorResponse, readBody } from "@/server/http";
import { applyBudgetModelToMonth } from "@/server/models-service";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await readBody(request, { required: ["monthKey"] });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json({
      plan: applyBudgetModelToMonth(
        (await context.params).id,
        parsed.body.monthKey,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
