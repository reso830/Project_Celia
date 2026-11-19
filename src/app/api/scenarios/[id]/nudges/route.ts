import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import { nudgeFields, readForecasterBody } from "@/server/forecaster-http";
import { upsertScenarioNudge } from "@/server/forecaster-service";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const body = await readForecasterBody(request, nudgeFields, {});
    return Response.json(
      upsertScenarioNudge(getDatabase(), (await params).id, body),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
