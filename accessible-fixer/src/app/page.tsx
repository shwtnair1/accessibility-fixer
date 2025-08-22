export default function HomePage() {
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
							defaultValue="<button>click</button>"
							aria-describedby="snippet-help"
						/>
						<p id="snippet-help" className="mt-2 text-xs text-gray-500">Paste your JSX/HTML snippet. We will analyze and suggest accessibility fixes.</p>
						<div className="mt-4">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
								aria-controls="results"
							>
								Fix Accessibility
							</button>
						</div>
					</section>
					<section aria-labelledby="results-label" className="flex flex-col">
						<h2 id="results-label" className="mb-2 text-sm font-medium text-gray-700">Results</h2>
						<div id="results" className="min-h-[320px] w-full rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-500">
							{/* Placeholder for results */}
							No results yet.
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}