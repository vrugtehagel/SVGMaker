console.log('%cHi there!', 'font:50px/1.5 monospace;');
console.log('If you\'re a programmer, and you\'re looking for extra features, you should try pressing F1!');
console.log('If you\'re not, then maybe don\'t. Or do. But never paste stuff in here just because someone tells you to.');

document.addEventListener('DOMContentLoaded', () => {
	UI.setup();
	terminal.setup();
	options.setup();
	current.setup();
	UI.SVG.setup();
	UI.swapTo('text');
});

HTMLElement.prototype.empty = function(){ while(this.firstChild) this.removeChild(this.lastChild); };
HTMLElement.prototype.remove = function(){ this.parentNode.removeChild(this); };

const parseCSS = function(string){
	// takes inline css as string, parses it and returns an object
	// example:
	// input:
	//		"fill:none;filter:url(#my-filter);stroke-width: 1px;"
	// output:
	//		[
	//			{ property: 'fill', value: 'none' },
	//			{ property: 'filter', value: 'url(#my-filter' },
	//			{ property: 'stroke-width', value: '1px' }
	//		]
	if(!string) return [];
	let result = [];
	let stringDelimiter = null;
	let inComment = false;
	let lastCharacter = '';
	let escaped = false;
	let current = { property: null, value: null };
	let currentString = '';
	let depth = 0;
	for(c of string){
		if(inComment){
			if(lastCharacter == '*' && c == '/') inComment = false;
			else {
				// do nothing
			}
		}
		else if(stringDelimiter){
			if(escaped) escaped = false;
			else if(c == '\\') escaped = true;
			else if(c == stringDelimiter) stringDelimiter = null;
			currentString += c;
		}
		else if(c == '*'){
			if(lastCharacter == '/'){
				inComment = true;
				currentString = currentString.slice(0, -1);
			}
		}
		else if(c == '"' || c == '\''){
			stringDelimiter = c;
			if(!current.property) return false;
			currentString += c;
		}
		else if(c == ':'){
			if(depth != 0) return false;
			current.property = currentString.trim();
			currentString = '';
		}
		else if(c == ';'){
			if(depth != 0) return false;
			current.value = currentString.trim();
			currentString = '';
			result.push({...current});
			current = { property: null, value: null }
		}
		else if(c == '('){
			if(!current.property) return false;
			currentString += c;
			++depth;
		}
		else if(c == ')'){
			if(!current.property) return false;
			currentString += c;
			--depth;
			if(depth < 0) return false;
		}
		else {
			currentString += c;
		}
		lastCharacter = c;
	}
	if(currentString && current.property){
		if(depth != 0) return false;
		current.value = currentString.trim();
		result.push({...current});
	}
	return result;
};

LEFT_MOUSE_BUTTON = 0;
RIGHT_MOUSE_BUTTON = 2;
DEFAULT_SVG = `<svg viewBox="0 0 100 100">
	<rect x="0" y="0" width="100" height="100" style="fill:#abd3e4;"/>
	<path d="M53 65L71 44L100 86L65 101Z" style="fill: #a59dac;"/>
	<path d="M-4 77L31 32L78 98L28 109L-4 88Z" style="fill: #ada6b7;"/>
	<path d="M31 32L43 96L78 98ZM71 44L90 97L100 86Z" style="fill:rgba(0, 0, 0, 0.1);"/>
	<path d="M100 100H38L41 93C46 87 88 96 100 83Z" style="fill: #6f8e58;"/>
	<path d="M0 81C38 83 34 93 75 100H0ZZ" style="fill: #819c62;"/>
	<circle cx="76" cy="18" r="11" style="fill: #ffb965;"/>
</svg>`;