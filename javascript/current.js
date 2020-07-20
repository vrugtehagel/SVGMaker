current = {
	SVG: null,
	activeElement: null,
	activeBubble: null,
	creatingBubble: false,
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
			current.setSVGFromText(DEFAULT_SVG);
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
		const SVG = current.SVG.cloneNode(true);
		if(options.removeEmptyPaths){
			const paths = SVG.querySelectorAll('path');
			for(const path of paths){
				const d = path.getAttribute('d');
				const commands = d.match(/[a-z]/ig);
				if(commands.length == 1 && commands[0] == 'M') path.remove();
			}
		}
		if(options.autoFormatIndentation){
			const walk = (element, depth = 0) => {
				if(element.nodeType == Node.TEXT_NODE){
					element.remove();
				}
				else{
					const indentation = document.createTextNode('\n' + options.indentation.repeat(depth));
					if(element.parentNode) element.parentNode.insertBefore(indentation, element);
				}
				const children = Array.from(element.childNodes);
				for(const child of children) walk(child, depth + 1);
				if(element.nodeType == Node.ELEMENT_NODE && element.children.length){
					const indentation = document.createTextNode('\n' + options.indentation.repeat(depth));
					element.appendChild(indentation);
				}
			}
			walk(SVG);
		}
		const voidTags = ['path', 'circle', 'rect', 'line', 'ellipse'];
		let result = SVG.outerHTML;
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