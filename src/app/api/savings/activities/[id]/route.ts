import { errorResponse, readBody } from "@/server/http";
import {
  updateSavingsActivity,
  deleteSavingsActivity,
} from "@/server/savings-service";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const parsed = await readBody(request, {
    optional: ["kind", "amount", "date", "note"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json(
      updateSavingsActivity((await context.params).id, parsed.body),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(_: Request, context: Context) {
  try {
    return Response.json(deleteSavingsActivity((await context.params).id));
  } catch (error) {
    return errorResponse(error);
  }
}
