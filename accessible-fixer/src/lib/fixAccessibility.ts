import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import generate from "@babel/generator";

export type FixLogItem = {
	category: string;
	action: string;
	selector: string;
	summary: string;
};

function getJSXIdentifierName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string {
	if (t.isJSXIdentifier(name)) return name.name;
	if (t.isJSXMemberExpression(name)) {
		const objectName = t.isJSXIdentifier(name.object) ? name.object.name : "";
		const propertyName = t.isJSXIdentifier(name.property) ? name.property.name : "";
		return `${objectName}.${propertyName}`.trim();
	}
	if (t.isJSXNamespacedName(name)) return `${name.namespace.name}:${name.name.name}`;
	return "";
}

function hasAttribute(opening: t.JSXOpeningElement, attrName: string): boolean {
	return opening.attributes.some(
		(attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === attrName
	);
}

function getAttribute(opening: t.JSXOpeningElement, attrName: string): t.JSXAttribute | undefined {
	return opening.attributes.find(
		(attr): attr is t.JSXAttribute => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === attrName
	);
}

function addOrSetStringAttribute(opening: t.JSXOpeningElement, name: string, value: string) {
	const existing = getAttribute(opening, name);
	const stringLiteral = t.stringLiteral(value);
	const attrValue: t.StringLiteral | t.JSXExpressionContainer = stringLiteral;
	if (existing) {
		existing.value = attrValue;
	} else {
		opening.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), attrValue));
	}
}

function getIdOrClass(opening: t.JSXOpeningElement): { id?: string; className?: string } {
	let id: string | undefined;
	let className: string | undefined;
	for (const attr of opening.attributes) {
		if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
		if (attr.name.name === "id" && attr.value && t.isStringLiteral(attr.value)) {
			id = attr.value.value;
		}
		if ((attr.name.name === "className" || attr.name.name === "class") && attr.value) {
			if (t.isStringLiteral(attr.value)) className = attr.value.value;
			if (t.isJSXExpressionContainer(attr.value) && t.isStringLiteral(attr.value.expression)) {
				className = attr.value.expression.value;
			}
		}
	}
	return { id, className };
}

function buildSelector(opening: t.JSXOpeningElement): string {
	const tag = getJSXIdentifierName(opening.name) || "*";
	const { id, className } = getIdOrClass(opening);
	let sel = tag;
	if (id) sel += `#${id}`;
	if (className) {
		for (const cls of className.split(/\s+/).filter(Boolean)) sel += `.${cls}`;
	}
	return sel;
}

function childrenTextContent(children: (t.JSXText | t.JSXExpressionContainer | t.JSXElement | t.JSXFragment | t.JSXSpreadChild | t.JSXEmptyExpression)[]): string {
	let text = "";
	for (const ch of children) {
		if (t.isJSXText(ch)) {
			text += ch.value;
		} else if (t.isJSXExpressionContainer(ch) && t.isStringLiteral(ch.expression)) {
			text += ch.expression.value;
		}
	}
	return text.replace(/\s+/g, "").trim();
}

function onlySvgChild(children: (t.JSXText | t.JSXExpressionContainer | t.JSXElement | t.JSXFragment | t.JSXSpreadChild | t.JSXEmptyExpression)[]): boolean {
	const elementChildren = children.filter((c): c is t.JSXElement => t.isJSXElement(c));
	const nonWhitespaceText = children.some((c) => t.isJSXText(c) && c.value.trim().length > 0);
	if (nonWhitespaceText) return false;
	return elementChildren.length === 1 && t.isJSXIdentifier(elementChildren[0].openingElement.name) && elementChildren[0].openingElement.name.name.toLowerCase() === "svg";
}

function isWrappedByLabel(path: NodePath<t.JSXOpeningElement>): boolean {
	let current: NodePath | null = path.parentPath;
	while (current) {
		if (current.isJSXElement()) {
			const opening = current.node.openingElement;
			if (t.isJSXIdentifier(opening.name) && opening.name.name.toLowerCase() === "label") return true;
		}
		current = current.parentPath as NodePath | null;
	}
	return false;
}

export function fixAccessibility(src: string): { code: string; log: FixLogItem[] } {
	const logs: FixLogItem[] = [];
	const wrapped = `const __X = (<div>\n${src}\n</div>);`;
	const ast = parse(wrapped, {
		sourceType: "module",
		plugins: ["jsx", "typescript"] as any,
	});

	traverse(ast, {
		JSXOpeningElement(path) {
			const opening = path.node;
			const tagName = getJSXIdentifierName(opening.name).toLowerCase();
			const selector = buildSelector(opening);

			// Rule 1: <img> with no alt
			if (tagName === "img" && !hasAttribute(opening, "alt")) {
				addOrSetStringAttribute(opening, "alt", "");
				logs.push({
					category: "a11y",
					action: "img-missing-alt",
					selector,
					summary: "Added empty alt attribute to <img>.",
				});
			}

			// Rule 2: <button> with only SVG child
			if (tagName === "button") {
				const elPath = path.parentPath as NodePath<t.JSXElement>;
				if (elPath && elPath.isJSXElement()) {
					const children = elPath.node.children;
					if (onlySvgChild(children) && !hasAttribute(opening, "aria-label")) {
						addOrSetStringAttribute(opening, "aria-label", "Button");
						logs.push({
							category: "a11y",
							action: "button-only-svg",
							selector,
							summary: "Added aria-label to button containing only an SVG.",
						});
					}
				}
			}

			// Rule 3: <a> with no text
			if (tagName === "a") {
				const elPath = path.parentPath as NodePath<t.JSXElement>;
				if (elPath && elPath.isJSXElement()) {
					const innerText = childrenTextContent(elPath.node.children);
					if (innerText.length === 0 && !hasAttribute(opening, "aria-label")) {
						addOrSetStringAttribute(opening, "aria-label", "Link");
						logs.push({
							category: "a11y",
							action: "anchor-no-text",
							selector,
							summary: "Added aria-label to anchor with no text content.",
						});
					}
				}
			}

			// Rule 4: <div onClick>
			if (tagName === "div" && hasAttribute(opening, "onClick")) {
				if (!hasAttribute(opening, "role")) {
					addOrSetStringAttribute(opening, "role", "button");
				}
				if (!hasAttribute(opening, "tabIndex")) {
					// tabIndex expects a numeric literal in JSX
					opening.attributes.push(
						t.jsxAttribute(
							t.jsxIdentifier("tabIndex"),
							t.jsxExpressionContainer(t.numericLiteral(0))
						)
					);
				}
				logs.push({
					category: "a11y",
					action: "div-clickable",
					selector,
					summary: "Added role=button and tabIndex=0 to clickable div.",
				});
			}

			// Rule 5: <input> with no label or aria-label
			if (tagName === "input") {
				const wrappedByLabel = isWrappedByLabel(path);
				const hasAriaLabel = hasAttribute(opening, "aria-label");
				if (!wrappedByLabel && !hasAriaLabel) {
					addOrSetStringAttribute(opening, "aria-label", "Input");
					logs.push({
						category: "a11y",
						action: "input-missing-label",
						selector,
						summary: "Added aria-label to input without associated label.",
					});
				}
			}
		},
	});

	// Extract transformed children inside the wrapper <div> we created
	let transformed = "";
	traverse(ast, {
		VariableDeclarator(path) {
			if (t.isIdentifier(path.node.id) && path.node.id.name === "__X" && path.node.init && (t.isJSXElement(path.node.init) || t.isJSXFragment(path.node.init))) {
				const root = path.node.init as t.JSXElement | t.JSXFragment;
				let children: (t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement | t.JSXFragment | t.JSXEmptyExpression)[] = [];
				if (t.isJSXElement(root)) {
					children = root.children;
				} else if (t.isJSXFragment(root)) {
					children = root.children;
				}
				const pieces = children.map((ch) => generate(ch).code.trim()).filter((s) => s.length > 0);
				transformed = pieces.join("\n");
			}
		},
	});

	return { code: transformed, log: logs };
}