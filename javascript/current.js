current = {
	SVG: null,
	activeElement: null,
	activeBubble: null,
	bubbles: [],
	size: null,
	editor: 'text',
	history: [],
	setup: function(){
		current.SVG = document.getElementById('product');
		current.restore();
	},
	save: function(){
		const text = current.getSVGAsText();
		localStorage.SVGMaker = text;
		history.unshift(text);
		let totalLength = current.history.reduce((acc, cur) => acc + cur.length, 0);
		while(totalLength > options.maxHistoryMemory) totalLength -= current.history.pop().length;
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
		try {
			const file = parser.parseFromString(text, 'image/svg+xml');
			const error = file.querySelector('parsererror');
			if(!error) return '';
			return error.textContent;
		}
		catch(error){
			return error.message;
		}
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