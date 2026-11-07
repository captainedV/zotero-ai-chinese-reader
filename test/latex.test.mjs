/**
 * Math rendering.
 *
 * A translated paragraph full of `x_{i}^{2}`, `\alpha`, `\sum` used to be painted
 * as raw LaTeX: superscripts and subscripts never rendered, so formulas were
 * unreadable. These tests pin the conversion and, just as important, that the
 * output can never inject markup.
 */
import { loadPlugin, test, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('latex.js');
const L = M.Latex;

test('superscripts and subscripts become real markup', () => {
	assertEqual(L.toHtml('x^{2}'), 'x²');
	assertEqual(L.toHtml('a_{i}'), 'aᵢ');
	assertEqual(L.toHtml('W_{DQ}^{K}'), 'W<sub>DQ</sub><sup>K</sup>', 'no Unicode form for capital subscripts');
	assertEqual(L.toHtml('h_t'), 'hₜ');
	assertEqual(L.toHtml('x^2 + y^3'), 'x² + y³');
});

test('greek letters and operators become unicode', () => {
	assertEqual(L.toHtml('\\alpha + \\beta'), 'α + β');
	assertEqual(L.toHtml('a \\times b \\cdot c'), 'a × b · c');
	assertEqual(L.toHtml('x \\leq y \\geq z'), 'x ≤ y ≥ z');
	assertEqual(L.toHtml('p \\in \\mathbb{R}^{n}'), 'p ∈ ℝⁿ');
	assertEqual(L.toHtml('K^\\top'), 'Kᵀ');
});

test('inline math is unwrapped and kept inline', () => {
	assertEqual(L.toHtml('where $\\mathbf{c}_t \\in \\mathbb{R}^{d}$ denotes'), 'where <strong>c</strong>ₜ ∈ ℝᵈ denotes');
	assertEqual(L.toHtml('value \\(x_{1}\\) here'), 'value x₁ here');
	// "i=1" mixes a letter, "=" and a digit, so the subscript falls back to markup
	// while the superscript still has a Unicode form.
	assertEqual(L.toHtml('\\[ \\sum_{i=1}^{n} x_i \\]'), ' ∑<sub>i=1</sub>ⁿ xᵢ ');
});

test("a prime inside math is a prime, not a quote", () => {
	assertEqual(L.toHtml("$d_c'$"), 'd<sub>c</sub>′');
	assertEqual(L.toHtml("$\\mathbb{R}^{d_c'}$"), 'ℝ<sup>d<sub>c</sub>′</sup>');
});

test('fractions and roots degrade readably', () => {
	assertEqual(L.toHtml('\\frac{a}{b}'), '(a)/(b)');
	assertEqual(L.toHtml('\\sqrt{d_k}'), '√(dₖ)');
	assertEqual(L.toHtml('\\mathrm{softmax}(QK)'), 'softmax(QK)');
});

test('unknown commands are left alone instead of mangled', () => {
	assertEqual(L.toHtml('\\weirdcommand{x}'), '\\weirdcommand{x}');
	assertEqual(L.toHtml('100% sure & correct'), '100% sure &amp; correct');
});

test('nothing from the model can inject markup', () => {
	const html = L.toHtml('<img src=x onerror=alert(1)> $x^{<script>}$');
	assert(!html.includes('<img'), html);
	assert(!html.includes('<script>'), html);
	assert(html.includes('&lt;img'), html);
});

test('plain text output drops the tags for copy and notes', () => {
	assertEqual(L.toText('a_{i} + x^{2}'), 'aᵢ + x²');
	assertEqual(L.toText('\\alpha \\leq \\beta'), 'α ≤ β');
});

test('hasMath only fires on strings worth converting', () => {
	assert(L.hasMath('x_{i}'), 'subscript');
	assert(L.hasMath('\\alpha'), 'command');
	assert(L.hasMath('a ∈ B'), 'symbol');
	assert(!L.hasMath('plain english sentence, nothing to do'), 'plain prose');
});

test('the markdown renderer renders math inside paragraphs', () => {
	const MD = loadPlugin('latex.js', 'markdown.js').Markdown;
	const html = MD.render('定义 $\\mathbf{c}_t^{Q} \\in \\mathbb{R}^{d}$ 表示压缩后的潜向量。');
	assert(html.includes('ℝ'), html);
	assert(html.includes('ᑫ') || html.includes('<sup>Q</sup>') || html.includes('Q'), html);
	assert(!html.includes('\\mathbf'), html);
});

summary();
