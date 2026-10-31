import { errorResponse, readBody } from "@/server/http";
import { renameMember } from "@/server/members-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const parsed = await readBody(request, { required: ["name"] });

  if ("response" in parsed) {
    return parsed.response;
  }

  try {
    const { id } = await params;
    return Response.json({ member: renameMember(id, parsed.body.name) });
  } catch (error) {
    return errorResponse(error);
  }
}
