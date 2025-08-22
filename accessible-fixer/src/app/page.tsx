"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false });

type LogItem = { category: string; action: string; selector: string; summary: string };

type FixResponse = { code: string; log: LogItem[] } | { error: string };

export default function HomePage() {
	const [input, setInput] = useState<string>("<button><svg/></button>\n<img src=\"/x.png\"/>\n<a href=\"#\"></a>\n<div onClick={() => {}}/>\n<input />");
	const [fixed, setFixed] = useState<string>("");
	const [log, setLog] = useState<LogItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleFix = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/fix", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code: input }),
			});
			const data: FixResponse = await res.json();
			if (!res.ok || "error" in data) {
				throw new Error((data as any).error || `Request failed with ${res.status}`);
			}
			setFixed((data as any).code || "");
			setLog((data as any).log || []);
		} catch (e: any) {
			setError(e?.message || "Unknown error");
		} finally {
			setLoading(false);
		}
	}, [input]);

	const hasResults = useMemo(() => fixed.length > 0 || log.length > 0, [fixed, log]);

	const copyFixed = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(fixed);
			alert("Copied fixed code to clipboard");
		} catch {
			alert("Failed to copy");
		}
	}, [fixed]);

	return (
		<main className="min-h-screen p-6">
			<div className="mx-auto max-w-6xl">
				<h1 className="text-2xl font-semibold mb-6">Accessible Fixer</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<section aria-labelledby="input-label" className="flex flex-col">
						<h2 id="input-label" className="sr-only">Input</h2>
						<label htmlFor="snippet" className="mb-2 text-sm font-medium text-gray-700">JSX/HTML Snippet</label>
						<textarea
							id="snippet"
							className="min-h-[320px] w-full rounded-md border border-gray-300 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Paste JSX or HTML here..."
							value={input}
							onChange={(e) => setInput(e.target.value)}
							aria-describedby="snippet-help"
						/>
						<p id="snippet-help" className="mt-2 text-xs text-gray-500">Paste your JSX/HTML snippet. We will analyze and suggest accessibility fixes.</p>
						<div className="mt-4">
							<button
								type="button"
								disabled={loading}
								onClick={handleFix}
								className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
								aria-controls="results"
							>
								{loading ? "Fixing..." : "Fix Accessibility"}
							</button>
						</div>
					</section>
					<section aria-labelledby="results-label" className="flex flex-col">
						<h2 id="results-label" className="mb-2 text-sm font-medium text-gray-700">Results</h2>
						<div id="results" className="w-full rounded-md border border-dashed border-gray-300 p-3 text-sm">
							{error && <p className="text-red-600">{error}</p>}
							{!hasResults && !error && <p className="text-gray-500">No results yet.</p>}
							{hasResults && (
								<div className="space-y-6">
									<div>
										<div className="flex items-center justify-between mb-2">
											<h3 className="font-medium">Fixed Code</h3>
											<button onClick={copyFixed} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Copy</button>
										</div>
										<pre className="whitespace-pre-wrap break-words rounded bg-gray-50 p-3 border text-[13px]">
											<code>{fixed}</code>
										</pre>
									</div>
									<div>
										<h3 className="font-medium mb-2">Diff</h3>
										<div className="rounded border">
											<ReactDiffViewer
												oldValue={input}
												newValue={fixed}
												splitView={true}
												leftTitle="Before"
												rightTitle="After"
											/>
										</div>
									</div>
									<div>
										<h3 className="font-medium mb-2">Changes</h3>
										<ul className="space-y-2">
											{log.map((item, idx) => (
												<li key={idx} className="rounded border p-2">
													<p className="text-xs text-gray-500">{item.category}</p>
													<p className="text-sm">{item.summary}</p>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}