import { errorResponse, readBody } from "@/server/http";
import { createSavingsBucket } from "@/server/savings-service";
export async function POST(request: Request) {
  const parsed = await readBody(request, {
    required: ["name", "type"],
    optional: [
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
    return Response.json(
      {
        bucket: createSavingsBucket({
          ...parsed.body,
          name: parsed.body.name,
          type: parsed.body.type,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
