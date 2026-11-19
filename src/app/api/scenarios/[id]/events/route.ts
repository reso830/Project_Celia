import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import {
  eventDescription,
  eventFields,
  readForecasterBody,
} from "@/server/forecaster-http";
import { createScenarioEvent } from "@/server/forecaster-service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const body = await readForecasterBody(
      request,
      eventFields,
      eventDescription,
    );
    const event = createScenarioEvent(getDatabase(), (await params).id, body);
    return Response.json(event, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
