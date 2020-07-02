current = {
	SVG: null,
	activeElement: null,
	activeBubble: null,
	bubbles: [],
	size: null,
	editor: 'text',
	setup: function(){
		current.SVG = document.getElementById('product');
		current.restore();
	},
	save: function(){
		localStorage.SVGMaker = current.getSVGAsText();
	},
	restore: function(){
		const textarea = document.querySelector('#text-editor textarea');
		if(!localStorage.SVGMaker){
			const defaultSVG = '<svg viewBox="0 0 5 5">\n\t<path style="fill:#355489;" d="M0 2V0H1V2H2V0H3V2H4V0H5V5H4V3H3V5Z"/>\n</svg>';
			current.setSVGFromText(defaultSVG);
			textarea.value = defaultSVG;
			return;
		}
		current.setSVGFromText(localStorage.SVGMaker);
		textarea.value = current.getSVGAsText();
	},
	SVGParseError: function(text){
		const parser = new DOMParser();
		const file = parser.parseFromString(text, 'image/svg+xml');
		const error = file.querySelector('parsererror');
		return error ? error.querySelector('div').textContent : '';
	},
	getSVGAsText: function(){
		const voidTags = ['path', 'circle', 'rect', 'line'];
		let result = current.SVG.outerHTML;
		for(const tag of voidTags){
			result = result.replace(new RegExp(`\>\s*\<\/${tag}\>`, 'g'), '/>');
		}
		result = result.replace(/ {4}/g, '\t')
			.replace(/\/\>(?!\n)/g, '/>\n')
			.replace(/\n\<(?!\/svg)/g, '\n\t<');
		return result;
	},
	setSVGFromText: function(string){
		const error = current.SVGParseError(string);
		const parent = current.SVG.parentNode;
		if(error) throw new Error(error);
		current.SVG.outerHTML = string;
		current.SVG = parent.firstElementChild;
		// set current.size
		(() => {
			const viewBox = current.SVG.getAttribute('viewBox').split(/\s+/g);
			const viewBoxWidth = viewBox[2];
			const viewBoxHeight = viewBox[3];
			const width = current.SVG.getAttribute('width');
			const height = current.SVG.getAttribute('height');
			const style = parseCSS(current.SVG.getAttribute('style'));
			const CSSWidth = style.width;
			const CSSHeight = style.height;
			current.size = {
				width: +(width || viewBoxWidth || CSSWidth || 0),
				height: +(height || viewBoxHeight || CSSHeight || 0)
			};
		})();
		return true;
	}
}