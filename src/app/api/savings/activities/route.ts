import { errorResponse, readBody } from "@/server/http";
import { createSavingsActivity } from "@/server/savings-service";
export async function POST(request: Request) {
  const parsed = await readBody(request, {
    required: ["bucketId", "kind", "amount", "date"],
    optional: ["note"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json(
      createSavingsActivity({
        ...parsed.body,
        bucketId: parsed.body.bucketId,
        kind: parsed.body.kind,
        amount: parsed.body.amount,
        date: parsed.body.date,
      }),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
