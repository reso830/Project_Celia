import { deleteEntry, updateEntry } from "@/server/entries-service";
import { errorResponse, readBody } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const parsed = await readBody(request, {
    optional: ["amount", "date", "itemId", "ownerMemberId", "note"],
  });
  if ("response" in parsed) return parsed.response;
  if (!Object.keys(parsed.body).length)
    return Response.json(
      { error: { code: "validation", message: "Provide a field to update." } },
      { status: 400 },
    );
  try {
    return Response.json({
      entry: updateEntry((await context.params).id, {
        ...parsed.body,
        ...(parsed.body.ownerMemberId === undefined
          ? {}
          : { ownerMemberId: parsed.body.ownerMemberId || null }),
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(_: Request, context: Context) {
  try {
    return Response.json({ id: deleteEntry((await context.params).id) });
  } catch (error) {
    return errorResponse(error);
  }
}
