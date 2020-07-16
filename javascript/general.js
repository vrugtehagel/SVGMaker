document.addEventListener('DOMContentLoaded', () => {
	UI.setup();
	terminal.setup();
	options.setup();
	current.setup();
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
	let result = {};
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
			result[current.property] = current.value;
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
		result[current.property] = current.value;
	}
	return result;
};

LEFT_MOUSE_BUTTON = 0;
RIGHT_MOUSE_BUTTON = 2;