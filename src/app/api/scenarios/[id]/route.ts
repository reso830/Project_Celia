import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import { readForecasterBody, scenarioFields } from "@/server/forecaster-http";
import { deleteScenario, updateScenario } from "@/server/forecaster-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const body = await readForecasterBody(request, {}, scenarioFields);
    const { id } = await params;
    return Response.json(updateScenario(getDatabase(), id, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    deleteScenario(getDatabase(), (await params).id);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
