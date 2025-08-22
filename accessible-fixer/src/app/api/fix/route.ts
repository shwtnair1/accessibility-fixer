import { NextResponse } from "next/server";
import { fixAccessibility } from "@/lib/fixAccessibility";

export async function POST(request: Request) {
	try {
		const contentType = request.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
		}
		const body = await request.json().catch(() => null) as { code?: string } | null;
		if (!body || typeof body.code !== "string") {
			return NextResponse.json({ error: "Invalid body: expected { code: string }" }, { status: 400 });
		}
		const result = fixAccessibility(body.code);
		return NextResponse.json({ code: result.code, log: result.log }, { status: 200 });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}