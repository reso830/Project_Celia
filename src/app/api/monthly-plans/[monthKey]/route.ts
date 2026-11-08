import { errorResponse, readBody } from "@/server/http";
import { reviseMonthlyBudgetPlan } from "@/server/models-service";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ monthKey: string }> },
) {
  const parsed = await readBody(request, {
    required: ["targetType", "targetId", "amount"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json({
      plan: reviseMonthlyBudgetPlan((await context.params).monthKey, {
        targetType: parsed.body.targetType,
        targetId: parsed.body.targetId,
        amount: parsed.body.amount,
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
