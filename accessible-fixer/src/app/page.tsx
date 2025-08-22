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
	const [refining, setRefining] = useState<Record<number, boolean>>({});

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
		const groups: Record<string, (LogItem & { index: number })[]> = {};
		log.forEach((item, index) => {
			if (!groups[item.category]) groups[item.category] = [];
			groups[item.category].push({ ...item, index });
		});
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

	const canRefine = (action: string) => {
		return action === "img-missing-alt" || action === "anchor-no-text" || action === "button-only-svg" || action === "input-missing-label";
	};

	const refineWithAI = useCallback(async (item: LogItem, idx: number) => {
		setRefining((r) => ({ ...r, [idx]: true }));
		try {
			const payload: any = {
				filename: "snippet",
				context: `${item.selector}\n${edited}`,
				currentAlt: item.action === "img-missing-alt" ? "" : null,
			};
			const res = await fetch("/api/ai", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok || data?.error) throw new Error(data?.error || `AI request failed`);
			let next = edited;
			if (item.action === "img-missing-alt" && data.alt) {
				next = replaceFirst(next, /alt=""/, `alt="${escapeQuotes(data.alt)}"`);
			}
			if (item.action === "anchor-no-text" && data.linkText) {
				next = replaceFirst(next, /aria-label="Link"/, `aria-label="${escapeQuotes(data.linkText)}"`);
			}
			if (item.action === "button-only-svg" && data.linkText) {
				next = replaceFirst(next, /aria-label="Button"/, `aria-label="${escapeQuotes(data.linkText)}"`);
			}
			if (item.action === "input-missing-label" && (data.linkText || data.alt)) {
				const val = data.linkText || data.alt;
				next = replaceFirst(next, /aria-label="Input"/, `aria-label="${escapeQuotes(val)}"`);
			}
			setEdited(next);
		} catch (e: any) {
			alert(e?.message || "AI refine failed");
		} finally {
			setRefining((r) => ({ ...r, [idx]: false }));
		}
	}, [edited]);

	return (
		<main className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-6xl px-6 py-4">
				<h1 className="text-xl md:text-2xl font-semibold mb-4">Accessibility Fixer</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6" style={{ minHeight: "calc(100vh - 90px)" }}>
					<section aria-labelledby="input-label" className="flex min-h-0 flex-col">
						<h2 id="input-label" className="sr-only">Input</h2>
						<label htmlFor="snippet" className="mb-2 text-sm font-medium text-gray-700">JSX/HTML Snippet</label>
						<div className="flex-1 min-h-0">
							<textarea
								id="snippet"
								className="h-full w-full rounded-lg border border-slate-800 bg-slate-900 text-slate-100 caret-white shadow-sm p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder:text-slate-400 transition focus:shadow-md"
								placeholder="Paste JSX or HTML here..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								aria-describedby="snippet-help"
							/>
						</div>
						<p id="snippet-help" className="mt-2 text-xs text-gray-500">Paste your JSX/HTML snippet. We will analyze and suggest accessibility fixes.</p>
						<div className="mt-3">
							<button
								type="button"
								disabled={loading}
								onClick={handleFix}
								className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
								aria-controls="results"
							>
								{loading ? "Fixing..." : "Fix Accessibility"}
							</button>
						</div>
					</section>
					<section aria-labelledby="results-label" className="flex min-h-0 flex-col">
						<h2 id="results-label" className="mb-2 text-sm font-medium text-gray-700">Results</h2>
						<div id="results" className="flex-1 min-h-0 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
							{error && <p className="text-red-600">{error}</p>}
							{!hasResults && !error && <p className="text-gray-500">No results yet.</p>}
							{hasResults && (
								<Tabs.Root defaultValue="diff" className="flex h-full flex-col">
									<Tabs.List className="mb-3 inline-flex rounded-md border bg-gray-50 p-1 text-sm shadow-sm">
										<Tabs.Trigger value="diff" className="px-3 py-1.5 rounded transition data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900">Diff</Tabs.Trigger>
										<Tabs.Trigger value="code" className="px-3 py-1.5 rounded transition data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900">Fixed Code</Tabs.Trigger>
										<Tabs.Trigger value="log" className="px-3 py-1.5 rounded transition data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-900">Change Log</Tabs.Trigger>
									</Tabs.List>

									<div className="flex-1 min-h-0">
										<Tabs.Content value="diff" className="h-full outline-none">
											<div className="h-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-auto">
												<ReactDiffViewer
													oldValue={input}
													newValue={fixed}
													splitView={true}
													leftTitle="Before"
													rightTitle="After"
												/>
											</div>
										</Tabs.Content>

										<Tabs.Content value="code" className="h-full outline-none">
											<div className="mb-2 flex items-center justify-between">
												<h3 className="font-medium">Fixed Code (Editable)</h3>
												<button onClick={copyFixed} className="rounded border px-2 py-1 text-xs hover:bg-gray-50 active:scale-[.99] transition">Copy</button>
											</div>
											<div className="h-[calc(100%-40px)] rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
												<MonacoEditor
													height="100%"
													defaultLanguage="html"
													value={edited}
													onChange={(v) => setEdited(v || "")}
													theme="vs-dark"
													options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", smoothScrolling: true, scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 } }}
												/>
											</div>
										</Tabs.Content>

										<Tabs.Content value="log" className="h-full outline-none">
											<div className="h-full overflow-auto space-y-3">
												{Object.keys(groupedLog).map((category) => (
													<div key={category} className="rounded-lg border border-slate-200 bg-white shadow-sm">
														<div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-sm font-medium rounded-t-lg">
															<span>{category}</span>
															<span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[10px]">Fixed</span>
														</div>
														<ul className="p-2 space-y-2 text-sm">
															{groupedLog[category].map((item) => (
																<li key={item.index} className="flex items-start justify-between gap-3">
																	<div>
																		<p className="text-gray-700">
																			{item.summary}
																			<span className="ml-2 inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-[10px]">Fixed</span>
																		</p>
																		<p className="text-[11px] text-gray-500">{item.selector}</p>
																	</div>
																	{canRefine(item.action) && (
																		<div className="flex items-center gap-2">
																			<span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 text-[10px]">Suggested</span>
																			<button
																				onClick={() => refineWithAI(item, item.index)}
																				disabled={!!refining[item.index]}
																				className="shrink-0 rounded border px-2 py-1 text-xs hover:bg-gray-50 active:scale-[.99] disabled:opacity-50 transition"
																			>
																				{refining[item.index] ? "Refining..." : "Refine with AI"}
																			</button>
																		</div>
																	)}
																</li>
															))}
														</ul>
													</div>
											))}
										</div>
									</Tabs.Content>
								</div>
							</Tabs.Root>
							)}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

function replaceFirst(source: string, pattern: RegExp, replacement: string): string {
	const m = source.match(pattern);
	if (!m) return source;
	return source.replace(pattern, replacement);
}

function escapeQuotes(s: string): string {
	return s.replace(/"/g, "\\\"");
}