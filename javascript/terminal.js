const terminal = {
	_pre: null,
	HIGHLIGHT: {backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#101010'},
	setup: function(){
		const section = document.getElementById('terminal');
		const input = section.querySelector('input');
		let historyIndex = -1;
		let currentValue = '';
		terminal._pre = section.querySelector('pre');
		// handle standard functionality
		section.addEventListener('click', () => {
			input.focus();
		});
		input.addEventListener('keydown', event => {
			if(event.key == 'Enter'){
				if(!input.value) return;
				historyIndex = -1;
				terminal.run(input.value);
				input.value = '';
				return;
			}
		});
		// set command names
		for(const command in terminal.commands) terminal.commands[command].name = command;
		// set history arrow key navigation
		input.addEventListener('keydown', event => {
			if(event.key == 'ArrowDown'){
				if(historyIndex == -1) return;
				historyIndex--;
				if(historyIndex == -1) return input.value = currentValue;
				input.value = terminal.history[historyIndex];
				return;
			}
			if(event.key == 'ArrowUp'){
				if(historyIndex == -1) currentValue = input.value;
				if(historyIndex == terminal.history.length - 1) return;
				historyIndex++;
				input.value = terminal.history[historyIndex];
				return;
			}
		})
	},
	write: function(text, css){
		if(!css){
			const textNode = document.createTextNode(text + '\n');
			terminal._pre.appendChild(textNode);
			return;
		}
		const span = document.createElement('span');
		span.textContent = text + '\n';
		for(const prop in css) span.style[prop] = css[prop];
		terminal._pre.appendChild(span);
	},
	error: function(text){
		const textNode = document.createTextNode(text + '\n');
		const span = document.createElement('span');
		span.textContent = 'error: ';
		span.className = 'error';
		terminal._pre.appendChild(span);
		terminal._pre.appendChild(textNode);
	},
	run: function(command, initial = true){
		terminal.history.unshift(command);
		if(initial) terminal.write('> ' + command);
		else terminal.write(command);
		const name = command.includes(' ') ? command.slice(0, command.indexOf(' ')) : command;
		if(!terminal.commands[name]) return terminal.error(`command "${name}" was not recognized as a valid command`);
		const args = [];
		let escaped = false;
		let stringDelimiter = false;
		let current = '';
		[...command.replace(name, '').trim()].forEach(c => {
			current += c;
			if(escaped) return escaped = false;
			if(c == '\\') return escaped = true;
			if(stringDelimiter) return stringDelimiter == c && (stringDelimiter = false);
			if(c == '\'' || c == '"') return stringDelimiter = c;
			if(c == ' '){
				args.push(current.slice(0, -1));
				current = '';
			}
		});
		if(current) args.push(current);
		terminal.commands[name].action(...args);
	},
	history: [],
	commands: {
		'help': {
			action: function(...args){
				if(args.length == 0){
					for(const name in terminal.commands){
						const command = terminal.commands[name];
						if(name == 'help') continue;
						terminal.write(name.padEnd(50, ' ') + command.description);
					}
					terminal.write('');
					terminal.write('For info on a specific command, type help [command].');
				}
				else if(args.length == 1){
					const name = args[0];
					if(!terminal.commands[name]) terminal.error(`command "${name}" was not recognized as a valid command`);
					const command = terminal.commands[name];
					if(typeof command.syntax == 'string') terminal.write(command.syntax);
					else for(const line of command.syntax) terminal.write(line[0].padEnd(50, ' ') + line[1]);
				}
				else terminal.error('Invalid argument list');
			},
			syntax: [['Help yourself!', '']]
		},
		'options': {
			action: function(action, option, value){
				if(action == 'get'){
					terminal.write(options[option]);
					return;
				}
				if(action == 'set'){
					if(value == 'true') value = true;
					else if(value == 'false') value = false;
					else if(value == +value) value = +value;
					else if(value[0] == '"' && value.slice(-1) == '"') value = JSON.parse(`{"s":${value}}`).s;
					if(options[option] === undefined) terminal.error(`option "${option}" does not exist`);
					else options.set(option, value);
					return;
				}
				if(action == '' || action === undefined){
					for(const [option, value] of Object.entries(options)){
						if(typeof value == 'function') continue;
						terminal.write(option.padEnd(50, ' ') + value);
					}
					return;
				}
				terminal.error('invalid action: should be none, "get" or "set"')
			},
			description: 'Get and set general options',
			syntax: [
				['options', 'see all options'],
				['options get [option]', 'get the value of [option]'],
				['options set [option] [value]', 'set the value of [option] to [value]']
			]
		},
		'exit': {
			action: function(){
				terminal._pre.empty();
				UI.swapTo('text');
			},
			description: 'exit the terminal',
			syntax: [['exit', 'exits the terminal. You may also press F1 to close the terminal.']]
		},
		'clear': {
			action: function(){
				terminal._pre.empty();
			},
			description: 'clear the terminal',
			syntax: [['clear', 'clear the terminal of all text']]
		},
		'save_as': {
			action: function(format, width, height, quality = .8){
				if(!format) return terminal.error('invalid argument list');
				const xmlns = current.SVG.hasAttribute('xmlns');
				if(!xmlns) current.SVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
				const content = current.getSVGAsText();
				const dataURL = 'data:image/svg+xml;base64,' + btoa(content);
				if(!xmlns) current.SVG.removeAttribute('xmlns');
				const a = document.createElement('a');
				const body = document.body;
				if(format == 'svg'){
					a.href = dataURL;
					a.download = 'untitled.svg';
					body.appendChild(a);
					a.click();
					setTimeout(() => body.removeChild(a), 20);
					return;
				}
				if(format == 'png'){
					if(!width || !height) return terminal.error('invalid argument list');
					a.download = 'untitled.png';
					const img = new Image();
					const cnv = document.createElement('canvas');
					cnv.width = width;
					cnv.height = height;
					const ctx = cnv.getContext('2d');
					img.addEventListener('load', () => {
						ctx.drawImage(img, 0, 0, width, height);
						a.href = cnv.toDataURL('image/png');
						body.appendChild(a);
						a.click();
						setTimeout(() => body.removeChild(a), 20);
					});
					img.src = dataURL;
					return;
				}
				if(format == 'jpg' || format == 'jpeg'){
					if(!width || !height) return terminal.error('invalid argument list');
					a.download = 'untitled.' + format;
					const img = new Image();
					const cnv = document.createElement('canvas');
					cnv.width = width;
					cnv.height = height;
					const ctx = cnv.getContext('2d');
					img.addEventListener('load', () => {
						ctx.fillStyle = '#FFFFFF';
						ctx.fillRect(0, 0, width, height);
						ctx.drawImage(img, 0, 0, width, height);
						a.href = cnv.toDataURL('image/jpeg', quality > 1 ? quality / 100 : quality);
						body.appendChild(a);
						a.click();
						setTimeout(() => body.removeChild(a), 20);
					});
					img.src = dataURL;
				}
			},
			description: 'save the svg as a file (svg, png, jpg/jpeg)',
			syntax: [
				['save_as svg', 'save as svg'],
				['save_as png [width] [height]', 'save as png with given sizes'],
				['save_as jpg [width] [height] [quality]', 'save as jpg with given sizes and quality']
			]
		},
		'create_shadow': {
			action: function(x, y, blur, color){
				if(arguments.length != 4) return terminal.error('invalid argument list');
				const cnv = document.createElement('canvas');
				cnv.width = cnv.height = 1;
				const ctx = cnv.getContext('2d');
				ctx.fillStyle = color;
				ctx.fillRect(0, 0, 1, 1);
				const [r, g, b, a] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
				const hex = '#' +
					r.toString(16).padStart(2, '0') +
					g.toString(16).padStart(2, '0') +
					b.toString(16).padStart(2, '0');
				const alpha = a / 255;
				const X = parseFloat(x);
				const Y = parseFloat(y);
				const B = parseFloat(blur);
				const result = 
					`	<filter id="shadow-${X}-${Y}-${B}-${hex.slice(1)}${a.toString(16).padStart(2, '0')}" width="${100 + B}%" height="${100 + B}%">\n` +
					`			<feDropShadow dx="${X}" dy="${Y}" stdDeviation="${B / 2}" flood-color="${hex}" flood-opacity="${Math.round(alpha * 1000) / 1000}"/>\n` +
					`		</filter>\n` +
					`	`;
				if(!current.SVG.querySelector('defs')) current.SVG.insertAdjacentHTML('afterbegin', `\n\t<defs>\n\t</defs>`);
				const defs = current.SVG.querySelector('defs');
				defs.insertAdjacentHTML('beforeend', result);
				terminal.write('result has been added to the <defs> of your SVG');
			},
			description: 'creates an SVG filter for a drop shadow',
			syntax: [['create_shadow [x] [y] [blur] [color]', 'creates SVG filter with given parameters']]
		},
		'set_background': {
			action: function(args){
				const preview = document.getElementById('preview');
				const CSS = [...arguments].join(' ') || '50% 50% / contain no-repeat';
				if(args == 'none') return preview.style.background = 'none';
				const input = document.createElement('input');
				input.setAttribute('type', 'file');
				input.setAttribute('accept', 'image/*');
				input.addEventListener('change', () => {
					const file = input.files[0];
					if(!file) return terminal.error('No file chosen');
					const reader = new FileReader();
					reader.addEventListener('load', () => {
						preview.style.background = `url(${reader.result}) ${CSS}`;
					});
					reader.readAsDataURL(file);
				});
				input.click();
			},
			description: 'sets a background image behind the preview',
			syntax: [
				['set_background none', 'remove background'],
				['set_background [options]', 'set background with options to pass on to the background CSS property'],
				['set_background', 'set background with default options ("50% 50% / contain no-repeat")']
			]
		},
		'theme': {
			action: function(name){
				if(!name){
					const themes = ['default', 'light', 'contrast'];
					themes.forEach(theme => terminal.write(theme));
				}
				else{
					terminal.run('options set theme ' + name, false);
				}
			},
			description: 'set a theme for the editor',
			syntax: [
				['theme', 'list the available themes'],
				['theme [name]', 'set theme']
			]
		},
		'scale': {
			action: function(factor){
				let viewBox = current.SVG.getAttribute('viewBox');
				if(viewBox) current.SVG.setAttribute('viewBox', viewBox.split(/\s*[,\s]\s*/).map(n => n * factor).join(' '));
				const elements = current.SVG.querySelectorAll('*');
				for(const element of elements){
					if(element.tagName == 'path'){
						const path = new Path(element);
						for(const item of path.data){
							const command = item.command;
							const roles = Path.commands[command];
							item.data = item.data.map((num, i) => {
								const role = roles[i];
								if(role == 'o') return i < 2 ? num * factor : num;
								return num * factor;
							});
						}
						path._update();
					}
					else if(NonPath.support.includes(element.tagName)){
						const nonpath = new NonPath(element);
						Object.keys(nonpath.data).forEach(key => {
							nonpath.data[key] *= factor;
						});
						nonpath._update();
					}
					const css = parseCSS(element.getAttribute('style'));
					if(!css.length) continue;
					const properties = ['stroke-width'];
					properties.forEach(property => {
						const declaration = css.find(declaration => declaration.property == property);
						if(!declaration) return;
						const value = declaration.value;
						if(!value || isNaN(parseFloat(value))) return;
						const unit = value.replace(/\d*[\.\d]\d*/, '');
						declaration.value = (parseFloat(value) * factor) + '' + unit;
					});
					const cssString = css.reduce((result, declaration) => result + declaration.property + ':' + declaration.value + ';', '');
					element.setAttribute('style', cssString);
				}
			},
			description: 'scale svg by a factor',
			syntax: [['scale [factor]', 'scale all supported elements by a factor']]
		},
		'encode': {
			action: function(){
				const xmlns = current.SVG.hasAttribute('xmlns');
				if(!xmlns) current.SVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
				let result = current.getSVGAsText();
				if(!xmlns) current.SVG.removeAttribute('xmlns');
				result = result.replace(/"/g, '\'')
					.replace(/>\s+</g, '><')
					.replace(/\s{2,}/g, ' ')
					.replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);
				result = `data:image/svg+xml,${result}`;
				terminal.write(result);
				navigator.clipboard.writeText(result)
					.then(() => terminal.write('result has been copied to clipboard'))
					.catch(() => terminal.error('result could not be copied to clipboard'));
			},
			description: 'encode to data URL',
			syntax: [['encode', 'converts SVG to data URL and copies to clipboard']]
		}
	}
}