import { getDatabase } from "@/server/db/database";
import { errorResponse } from "@/server/http";
import { readForecasterBody, scenarioFields } from "@/server/forecaster-http";
import { createScenario } from "@/server/forecaster-service";
import { listScenarios } from "@/server/forecaster-store";

export function GET() {
  try {
    return Response.json({ scenarios: listScenarios(getDatabase()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readForecasterBody(request, scenarioFields, {});
    return Response.json(createScenario(getDatabase(), body), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
