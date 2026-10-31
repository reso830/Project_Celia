import { createCategory } from "@/server/categories-service";
import { errorResponse, readBody } from "@/server/http";

export async function POST(request: Request) {
  const parsed = await readBody(request, {
    required: ["umbrella", "name"],
    optional: ["color"],
  });
  if ("response" in parsed) return parsed.response;
  try {
    return Response.json(
      {
        category: createCategory(
          parsed.body.umbrella,
          parsed.body.name,
          parsed.body.color,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
