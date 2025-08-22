import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const contentType = request.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
		}
		const body = await request.json().catch(() => null) as {
			filename?: string;
			context?: string;
			currentAlt?: string | null;
			href?: string;
		} | null;
		if (!body) {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}
		const filename = body.filename ?? "snippet";
		const context = body.context ?? "";
		const currentAlt = body.currentAlt ?? null;
		const href = body.href;

		const openaiKey = process.env.OPENAI_API_KEY;
		let result: { alt?: string; linkText?: string } | null = null;

		const system = `You are an assistant that writes concise, descriptive and accessible text per WCAG.
Return ONLY a strict JSON object with optional keys: alt, linkText.
- alt: a short, specific alt text for an image (avoid the words image/picture/photo unless essential)
- linkText: meaningful link text that describes the destination or action
Constraints:
- Max 80 characters each
- No quotes around JSON keys or values other than standard JSON
- Do not include any explanations.`;
		const user = {
			filename,
			context,
			currentAlt,
			href,
		};

		if (openaiKey) {
			try {
				const resp = await fetch("https://api.openai.com/v1/chat/completions", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"authorization": `Bearer ${openaiKey}`,
					},
					body: JSON.stringify({
						model: "gpt-4o-mini",
						response_format: { type: "json_object" },
						messages: [
							{ role: "system", content: system },
							{ role: "user", content: JSON.stringify(user) },
						],
						temperature: 0.2,
						max_tokens: 100,
					}),
				});
				if (resp.ok) {
					const data = await resp.json();
					const text: string | undefined = data?.choices?.[0]?.message?.content;
					if (text) {
						try { result = JSON.parse(text); } catch {}
					}
				}
			} catch {}
		}

		// Fallback heuristic if OpenAI missing or failed
		if (!result) {
			if (href) {
				result = { linkText: deriveLinkText(href, context) };
			} else {
				result = { alt: deriveAltText(filename, context, currentAlt) };
			}
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

function deriveAltText(filename: string, context: string, currentAlt: string | null | undefined): string {
	const base = filename.split("/").pop() || filename;
	const name = base.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[-_]/g, " ").trim();
	const ctx = (context || "").trim();
	if (currentAlt && currentAlt.trim().length > 0) return currentAlt.trim();
	if (ctx.length > 0) return truncate(ctx, 80);
	return truncate(name || "image", 80);
}

function deriveLinkText(href: string, context: string): string {
	try {
		const u = new URL(href, "http://example.com");
		const parts = (u.pathname || "/").split("/").filter(Boolean);
		if (parts.length > 0) return truncate(capitalize(parts[parts.length - 1].replace(/[-_]/g, " ")), 80);
	} catch {}
	return truncate(context || "Open link", 80);
}

function truncate(s: string, n: number): string {
	return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }