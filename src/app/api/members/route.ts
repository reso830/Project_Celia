import { addMember } from "@/server/members-service";
import { errorResponse, readBody } from "@/server/http";

export async function POST(request: Request) {
  const parsed = await readBody(request, { required: ["name"] });

  if ("response" in parsed) {
    return parsed.response;
  }

  try {
    return Response.json(
      { member: addMember(parsed.body.name) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
