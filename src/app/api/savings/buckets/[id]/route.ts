import { errorResponse, readBody } from "@/server/http";
import { updateSavingsBucket } from "@/server/savings-service";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await readBody(request, {
    optional: [
      "name",
      "type",
      "openingBalance",
      "targetAmount",
      "targetMonth",
      "description",
      "countsTowardBuffer",
      "isDefault",
    ],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json({
      bucket: updateSavingsBucket((await context.params).id, parsed.body),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
