import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import {
  eventDescription,
  eventFields,
  readForecasterBody,
} from "@/server/forecaster-http";
import {
  deleteScenarioEvent,
  updateScenarioEvent,
} from "@/server/forecaster-service";

type Context = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const body = await readForecasterBody(
      request,
      {},
      { ...eventFields, ...eventDescription },
    );
    const { id, eventId } = await params;
    return Response.json(updateScenarioEvent(getDatabase(), id, eventId, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: Context) {
  try {
    const { id, eventId } = await params;
    deleteScenarioEvent(getDatabase(), id, eventId);
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
