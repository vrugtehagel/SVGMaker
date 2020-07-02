current = {
	SVG: null,
	activeElement: null,
	path: null,
	creating: false,
	creatingData: [],
	setup: function(){
		current.SVG = UI.product;
		current.restore();
		current.size = current.getSize();
	},
	getAsText: function(){
		const voidTags = ['path', 'circle', 'rect', 'line'];
		current.SVG.removeAttribute('id');
		let result = current.SVG.outerHTML;
		current.SVG.setAttribute('id', 'product');
		for(const tag of voidTags){
			result = result.replace(new RegExp(`\>\s*\<\/${tag}\>`, 'g'), '/>');
		}
		result = result.replace(/ {4}/g, '\t')
			.replace(/\/\>(?!\n)/g, '/>\n')
			.replace(/\n\<(?!\/svg)/g, '\n\t<');
		return result;
	},
	save: function(){
		localStorage.SVGMaker = current.getAsText();
	},
	restore: function(){
		if(!localStorage.SVGMaker){
			current.SVGFrom('<svg viewBox="0 0 5 5">\n\t<path style="fill:#355489;" d="M0 2V0H1V2H2V0H3V2H4V0H5V5H4V3H3V5Z"/>\n</svg>');
			UI.updateTextarea();
			return;
		}
		current.SVGFrom(localStorage.SVGMaker);
		UI.updateTextarea();
	},
	SVGParseError: function(text){
		const parser = new DOMParser();
		const file = parser.parseFromString(text, 'image/svg+xml');
		const error = file.querySelector('parsererror');
		if(!error) return '';
		else return error.querySelector('div').textContent;
	},
	SVGFrom: function(thing, suppressErrors = false){
		if(typeof thing == 'string'){
			const error = current.SVGParseError(thing);
			if(error){
				if(!suppressErrors) UI.throwError(error);
				return false;
			}
			current.SVG.removeAttribute('id');
			UI.product.remove();
			UI.preview.insertAdjacentHTML('afterbegin', thing);
			current.SVG = UI.preview.children[0];
			current.SVG.setAttribute('id', 'product');
			UI.product = current.SVG;
			current.size = current.getSize();
			UI.setPreviewSize();
			return true;
		}
		else if(thing.nodeType && thing.tagName == 'svg'){
			current.SVG.removeAttribute('id');
			UI.product.remove();
			current.SVG = thing;
			UI.preview.insertBefore(current.SVG, UI.bubbles);
			current.SVG.setAttribute('id', 'product');
			UI.product = current.SVG;
			current.size = current.getSize();
			return true;
		}
		else throw new SyntaxError('invalid argument to current.SVGFrom');
	},
	size: null,
	getSize: function(){
		const viewBox = UI.product.getAttribute('viewBox').split(/\s+/g);
		const viewBoxWidth = viewBox[2];
		const viewBoxHeight = viewBox[3];
		const width = UI.product.getAttribute('width');
		const height = UI.product.getAttribute('height');
		const style = parseCSS(UI.product.getAttribute('style'));
		const CSSWidth = style.width;
		const CSSHeight = style.height;
		return {
			width: +(width || viewBoxWidth || CSSWidth || 0),
			height: +(height || viewBoxHeight || CSSHeight || 0)
		}
	},
	addPath: function(){
		const NS = 'http://www.w3.org/2000/svg';
		const path = document.createElementNS(NS, 'path');
		current.SVG.appendChild(path);
		return path;
	}
}