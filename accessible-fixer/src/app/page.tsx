"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false });
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type LogItem = { category: string; action: string; selector: string; summary: string };

type FixResponse = { code: string; log: LogItem[] } | { error: string };

export default function HomePage() {
	const [input, setInput] = useState<string>("<button><svg/></button>\n<img src=\"/x.png\"/>\n<a href=\"#\"></a>\n<div onClick={() => {}}/>\n<input />");
	const [fixed, setFixed] = useState<string>("");
	const [edited, setEdited] = useState<string>("");
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
			const out = (data as any).code || "";
			setFixed(out);
			setEdited(out);
			setLog((data as any).log || []);
		} catch (e: any) {
			setError(e?.message || "Unknown error");
		} finally {
			setLoading(false);
		}
	}, [input]);

	const hasResults = useMemo(() => (fixed.length > 0 || log.length > 0), [fixed, log]);

	const groupedLog = useMemo(() => {
		const groups: Record<string, LogItem[]> = {};
		for (const item of log) {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push(item);
		}
		return groups;
	}, [log]);

	const copyFixed = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(edited);
			alert("Copied fixed code to clipboard");
		} catch {
			alert("Failed to copy");
		}
	}, [edited]);

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
								<Tabs.Root defaultValue="diff">
									<Tabs.List className="mb-3 inline-flex rounded-md border bg-gray-50 p-1 text-sm">
										<Tabs.Trigger value="diff" className="px-3 py-1.5 rounded data-[state=active]:bg-white data-[state=active]:shadow">Diff</Tabs.Trigger>
										<Tabs.Trigger value="code" className="px-3 py-1.5 rounded data-[state=active]:bg-white data-[state=active]:shadow">Fixed Code</Tabs.Trigger>
										<Tabs.Trigger value="log" className="px-3 py-1.5 rounded data-[state=active]:bg-white data-[state=active]:shadow">Change Log</Tabs.Trigger>
									</Tabs.List>

									<Tabs.Content value="diff" className="outline-none">
										<div className="rounded border">
											<ReactDiffViewer
												oldValue={input}
												newValue={fixed}
												splitView={true}
												leftTitle="Before"
												rightTitle="After"
											/>
										</div>
									</Tabs.Content>

									<Tabs.Content value="code" className="outline-none">
										<div className="mb-2 flex items-center justify-between">
											<h3 className="font-medium">Fixed Code (Editable)</h3>
											<button onClick={copyFixed} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Copy</button>
										</div>
										<div className="h-[320px] rounded border">
											<MonacoEditor
												height="100%"
												defaultLanguage="html"
												value={edited}
												onChange={(v) => setEdited(v || "")}
												options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
											/>
										</div>
									</Tabs.Content>

									<Tabs.Content value="log" className="outline-none">
										<div className="space-y-3">
											{Object.keys(groupedLog).map((category) => (
												<div key={category} className="rounded border">
													<div className="border-b bg-gray-50 px-3 py-2 text-sm font-medium">{category}</div>
													<ul className="p-2 space-y-2 text-sm">
														{groupedLog[category].map((item, idx) => (
															<li key={idx}>
																<p className="text-gray-700">{item.summary}</p>
																<p className="text-[11px] text-gray-500">{item.selector}</p>
															</li>
														))}
													</ul>
												</div>
											))}
										</div>
									</Tabs.Content>
								</Tabs.Root>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}