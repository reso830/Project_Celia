import { createEntry } from "@/server/entries-service";
import { errorResponse, readBody } from "@/server/http";
export async function POST(request: Request) {
  const parsed = await readBody(request, {
    required: ["type", "amount", "date", "itemId"],
    optional: ["ownerMemberId", "note"],
  });
  if ("response" in parsed) return parsed.response;
  const { type, amount, date, itemId, ownerMemberId, note } = parsed.body;
  try {
    return Response.json(
      {
        entry: createEntry({
          type,
          amount,
          date,
          itemId,
          ownerMemberId: ownerMemberId || null,
          ...(note === undefined ? {} : { note }),
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
