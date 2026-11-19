import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import { duplicateScenario } from "@/server/forecaster-service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Context) {
  try {
    const copy = duplicateScenario(getDatabase(), (await params).id);
    return Response.json(copy, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
