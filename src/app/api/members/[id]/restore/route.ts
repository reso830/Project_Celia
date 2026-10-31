import { errorResponse, readBody } from "@/server/http";
import { restoreMember } from "@/server/members-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = await readBody(request, {});

  if ("response" in parsed) {
    return parsed.response;
  }

  try {
    const { id } = await params;
    return Response.json({ member: restoreMember(id) });
  } catch (error) {
    return errorResponse(error);
  }
}
