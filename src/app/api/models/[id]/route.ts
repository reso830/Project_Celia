import { errorResponse, readBody } from "@/server/http";
import { updateBudgetModel, deleteBudgetModel } from "@/server/models-service";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const parsed = await readBody(request, {
    optional: ["name", "description", "targetType", "targetId", "amount"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json({
      model: updateBudgetModel((await context.params).id, parsed.body),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(_: Request, context: Context) {
  try {
    return Response.json({ id: deleteBudgetModel((await context.params).id) });
  } catch (error) {
    return errorResponse(error);
  }
}
