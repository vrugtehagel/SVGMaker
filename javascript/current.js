current = {
	SVG: null,
	activeElement: null,
	activeBubble: null,
	bubbles: [],
	size: null,
	editor: 'text',
	history: [],
	setup: function(){
		current.SVG = document.querySelector('#preview svg');
		current.restore();
	},
	save: function({onlyLocalStorage} = {}){
		const text = current.getSVGAsText();
		localStorage.SVGMaker = text;
		if(current.history[0] == text) return;
		if(onlyLocalStorage) return;
		current.history = current.history.slice(current.history.index);
		current.history.unshift(text);
		current.history.index = 0;
		let totalLength = current.history.reduce((acc, cur) => acc + cur.length, 0);
		while(totalLength > options.maxHistoryMemory) totalLength -= current.history.pop().length;
	},
	undo: function(){
		if(current.history.index == current.history.length - 1) return;
		current.history.index++;
		const text = current.history[current.history.index];
		localStorage.SVGMaker = text;
		current.setSVGFromText(text);
	},
	redo: function(){
		if(current.history.index == 0) return;
		current.history.index--;
		const text = current.history[current.history.index];
		localStorage.SVGMaker = text;
		current.setSVGFromText(text);
	},
	restore: function(){
		if(!localStorage.SVGMaker){
			const defaultSVG = '<svg viewBox="0 0 5 5">\n\t<path style="fill:#355489;" d="M0 2V0H1V2H2V0H3V2H4V0H5V5H4V3H3V5Z"/>\n</svg>';
			current.setSVGFromText(defaultSVG);
			return;
		}
		current.setSVGFromText(localStorage.SVGMaker);
		current.save();
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
		if(options.autoFormatIndentation){
			const walk = (element, depth = 0) => {
				if(element.nodeType == Node.TEXT_NODE){
					element.remove();
				}
				else{
					const indentation = document.createTextNode('\n' + options.indentation.repeat(depth));
					element.parentNode.insertBefore(indentation, element);
				}
				const children = Array.from(element.childNodes);
				for(const child of children) walk(child, depth + 1);
				if(element.nodeType == Node.ELEMENT_NODE && element.children.length){
					const indentation = document.createTextNode('\n' + options.indentation.repeat(depth));
					element.appendChild(indentation);
				}
			}
			walk(current.SVG);
		}
		const voidTags = ['path', 'circle', 'rect', 'line'];
		let result = current.SVG.outerHTML;
		for(const tag of voidTags){
			result = result.replace(new RegExp(`\>\s*\<\/${tag}\>`, 'g'), '/>');
		}
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
			const viewBoxLeft = viewBox[0] || 0;
			const viewBoxTop = viewBox[1] || 0;
			const viewBoxWidth = viewBox[2];
			const viewBoxHeight = viewBox[3];
			const width = current.SVG.getAttribute('width');
			const height = current.SVG.getAttribute('height');
			const style = parseCSS(current.SVG.getAttribute('style'));
			const CSSWidth = style.width;
			const CSSHeight = style.height;
			current.size = {
				width: +(width || viewBoxWidth || CSSWidth || 0),
				height: +(height || viewBoxHeight || CSSHeight || 0),
				left: +viewBoxLeft,
				top: +viewBoxTop
			};
		})();
		return true;
	}
}