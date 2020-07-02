const UI = {
	bubbleCommand: null,
	bubbleOptions: null,
	peekCommands: null,
	visualEditor: null,
	textEditor: null,
	editButton: null,
	bubbleInfo: null,
	sidePanel: null,
	allPaths: null,
	terminal: null,
	textarea: null,
	addPath: null,
	preview: null,
	product: null,
	bubbles: null,
	error: null,
	body: null,

	dragging: null,
	currentBubble: null,
	allBubbles: [],
	mouse: {x: 0, y: 0},
	setup: function(){
		UI.bubbleCommand = document.getElementById('bubble-command');
		UI.bubbleOptions = document.getElementById('bubble-options');
		UI.peekCommands = document.getElementById('peek-commands');
		UI.visualEditor = document.getElementById('visual-editor');
		UI.textEditor = document.getElementById('text-editor');
		UI.editButton = document.getElementById('edit-button');
		UI.bubbleInfo = document.getElementById('bubble-info');
		UI.sidePanel = document.getElementById('side-panel');
		UI.allPaths = document.getElementById('all-paths');
		UI.terminal = document.getElementById('terminal')
		UI.textarea = document.querySelector('textarea');
		UI.addPath = document.getElementById('add-path');
		UI.preview = document.getElementById('preview');
		UI.product = document.getElementById('product');
		UI.bubbles = document.getElementById('bubbles');
		UI.error = document.getElementById('error');
		UI.body = document.querySelector('body');

		// general UI stuff
		(() => {
			UI.visualEditor.addEventListener('click', event => {
				if(UI.body.classList.contains('visual-editor')) return;
				//if(UI.editButton.contains(event.target)) return;
				UI.swapTo('visual');
			});

			UI.editButton.addEventListener('click', event => {
				event.stopPropagation();
				UI.swapTo('text');
			});

			UI.error.addEventListener('click', () => {
				clearTimeout(UI.throwError.timeoutID);
				UI.error.classList.remove('shown');
			});
		})();

		// update svg when textarea is being edited
		(() => {
			let timeoutID;
			UI.textarea.addEventListener('input', () => {
				clearTimeout(timeoutID);
				timeoutID = setTimeout(() => {
					current.SVGFrom(UI.textarea.value, true);
				}, options.editDelay);
			});
		})();

		// set the bubble mousemove and mouseup
		(() => {
			document.addEventListener('mousemove', event => {
				if(!UI.dragging) return;
				const element = UI.currentBubble.element;
				const point = UI.currentBubble.point;
				const dragX = point.axis == 'x' || point.axis == 'both';
				const dragY = point.axis == 'y' || point.axis == 'both';
				const coordinates = UI.getPositionInSVG(event.clientX, event.clientY);
				const x = coordinates.x;
				const y = coordinates.y;
				if(dragX) element.setAttribute('cx', x);
				if(dragY) element.setAttribute('cy', y);
				current.path.setPoint(point.id, x, y);
				UI.resetBubblePosition();
			});
			document.addEventListener('mouseup', event => {
				if(!UI.dragging) return;
				UI.dragging = false;
			});
		})();

		// set the "absolute" toggle on the bubbleinfo thing
		(() => {
			UI.bubbleCommand.addEventListener('click', () => {
				if(!UI.dragging) return;
				UI.currentBubble.path.toggleAbsolute(UI.currentBubble.point.id);
				const command = UI.bubbleCommand.textContent;
				UI.bubbleCommand.textContent = command.toLowerCase() == command ? command.toUpperCase() : command.toLowerCase();
			});
		})();

		// set the drag & zoom on the preview
		(() => {
			let sx, sy, mx, cx, cy, my, W, H;
			let dragging = false;
			let zoom = .5;
			const clamp = (n, min, max) => n < min ? min : n > max ? max : n;
			document.addEventListener('contextmenu', event => event.preventDefault());
			UI.visualEditor.addEventListener('mousedown', event => {
				if(event.button != RIGHT_MOUSE_BUTTON) return;
				event.preventDefault();
				const rect = UI.preview.getBoundingClientRect();
				const bigRect = UI.visualEditor.getBoundingClientRect();
				[cx, cy] = [bigRect.left || bigRect.x, bigRect.top || bigRect.y];
				[sx, sy] = [(rect.left || rect.x) - cx, (rect.top || rect.y) - cy];
				[mx, my] = [event.clientX - cx - sx - .5 * rect.width, event.clientY - cy - sy - .5 * rect.height];
				[W, H] = [bigRect.width, bigRect.height];
				dragging = true;
			});
			document.addEventListener('mousemove', event => {
				if(!dragging) return;
				let left = 100 * (event.clientX - cx - mx) / W;
				let top = 100 * (event.clientY - cy - my) / H;
				UI.preview.style.left = clamp(left, 0, 100) + '%';
				UI.preview.style.top = clamp(top, 0, 100) + '%';
			});
			document.addEventListener('mouseup', () => {
				if(!dragging) return;
				dragging = false;
			});

			document.addEventListener('wheel', event => {
				const delta = Math.sign(event.deltaY);
				if(event.deltaY < 0) zoom *= 0.9;
				if(event.deltaY > 0) zoom *= 1.1; 
				UI.preview.style.width = 100 * zoom + '%';
				UI.resetBubbleSize();
			});
		})();

		// set "tab" on textarea
		(() => {
			UI.textarea.addEventListener('keydown', event => {
				if(event.key == 'Tab'){
					event.preventDefault();
					const position = UI.textarea.selectionStart;
					if(position === undefined) return;
					UI.textarea.value = UI.textarea.value.slice(0, position)
						+ '\t'
						+ UI.textarea.value.slice(position);
					UI.textarea.selectionStart = position + 1;
					UI.textarea.selectionEnd = position + 1;
				}
			});
		})();

		// set save behavior
		(() => {
			document.addEventListener('keydown', event => {
				if(event.key == 's' && event.ctrlKey){
					event.preventDefault();
					const error = current.SVGParseError(UI.textarea.value);
					if(error){
						UI.throwError('Couldn\'t save, ' + error);
					}
					else{
						current.save();
						UI.textEditor.classList.add('saved');
					}
				}
			});
			UI.textarea.addEventListener('input', () => {
				UI.textEditor.classList.remove('saved');
			});
		})();

		// set the "add path" button
		(() => {
			UI.addPath.addEventListener('click', () => {
				const path = current.addPath();
				if(options.defaultPathStyle) path.setAttribute('style', options.defaultPathStyle);
				UI.updateSidePanel();
				UI.selectPath(path);
			});
		})();

		// set the command creating buttons
		(() => {
			document.addEventListener('keypress', event => {
				if(!UI.body.classList.contains('visual-editor')) return;
				const key = event.key.toUpperCase();
				if(!Path.commands[key]) return;
				UI.createCommand(key);
			});

			for(const li of UI.peekCommands.children){
				li.addEventListener('click', () => UI.createCommand(li.textContent));
			}
		})();

		// set bubbles for the creating mode and set mouse coordinates
		(() => {
			document.addEventListener('mousedown', event => {
				if(!current.creating) return;
				if(!(UI.preview.contains(event.target) || event.target == UI.visualEditor)) return UI.stopCreatingCommand();
				if(event.button == RIGHT_MOUSE_BUTTON) return UI.stopCreatingCommand();
				current.creatingData.push({x: UI.mouse.x, y: UI.mouse.y});
				if(current.creatingData.length == Path.getAmountOfPoints(current.creating)){
					current.path.addPoint(current.creating, current.creatingData);
					UI.moveCreatingBubbles();
					const command = current.creating;
					UI.stopCreatingCommand();
					UI.createCommand(command);
				}
				else {
					const g = UI.bubbles.querySelector('g');
					const circle = UI.createBubble(UI.mouse.x, UI.mouse.y);
					UI.currentBubble = {element: circle};
					g.appendChild(circle);
				}
			});
			document.addEventListener('mousemove', event => {
				const coordinates = UI.getPositionInSVG(event.clientX, event.clientY);
				UI.mouse.x = coordinates.x;
				UI.mouse.y = coordinates.y;
				if(!current.creating) return;
				const element = UI.currentBubble.element;
				element.setAttribute('cx', UI.mouse.x);
				element.setAttribute('cy', UI.mouse.y);
			});

			document.addEventListener('keydown', event => {
				if(event.key == 'Escape') UI.stopCreatingCommand();
			});
		})();

		// set opening the terminal
		(() => {
			document.addEventListener('keydown', event => {
				if(event.key == 'F1'){
					event.preventDefault();
					const isTerminal = UI.body.classList.contains('terminal');
					if(isTerminal) UI.swapTo('text');
					else UI.swapTo('terminal');
				}
			});
		})();
	},
	getPositionInSVG: function(x, y){
		const snap = x => options.snap * Math.round(x / options.snap);
		const rect = UI.preview.getBoundingClientRect();
		const size = current.size;
		return {
			x: snap((x - (rect.left || rect.x)) / rect.width * size.width),
			y: snap((y - (rect.top || rect.y)) / rect.height * size.height)
		};
	},
	swapTo: function(editor){
		UI.selectPath(null);
		if(editor == 'text'){
			UI.updateTextarea();
			UI.stopCreatingCommand();
			UI.body.classList.remove('visual-editor');
			UI.body.classList.remove('terminal');
		}
		else if(editor == 'visual'){
			const success = current.SVGFrom(UI.textarea.value);
			if(!success) return;
			UI.setPreviewSize();
			UI.updateSidePanel();
			UI.body.classList.add('visual-editor');
			UI.body.classList.remove('terminal');
			UI.textEditor.classList.remove('saved');
		}
		else if(editor == 'terminal'){
			UI.terminal.querySelector('input').focus();
			UI.body.classList.add('terminal');
			UI.body.classList.remove('visual-editor');
		}
	},
	selectPath: function(path){
		UI.hideBubbleInfo();
		for(const li of UI.allPaths.children) li.classList.remove('selected');
		if(!path){
			current.activeElement = null;
			current.path = null;
			UI.removeBubbles();
			return;
		}
		const li = (() => {
			const paths = UI.product.querySelectorAll('path');
			for(let i = 0; i < paths.length; ++i){
				if(paths[i] == path) return UI.allPaths.children[i];
			}
		})();
		current.activeElement = path;
		current.path = new Path(path);
		li.classList.add('selected');
		UI.setBubbles();
	},
	updateTextarea: function(){
		UI.textarea.value = current.getAsText();
	},
	updateSidePanel: function(){
		const paths = current.SVG.querySelectorAll('path');
		UI.allPaths.empty();
		for(const path of paths){
			const li = document.createElement('li');
			const span = document.createElement('span');
			const textarea = document.createElement('textarea');
			const id = path.getAttribute('id');
			const classes = Array.from(path.classList);
			const style = path.getAttribute('style') || '';
			span.textContent = id
				? '#' + id
				: `path${classes.length ? `.${classes.join('.')}` : ''}`;
			textarea.value = style.replace(/:(?!\s)/g, ': ').replace(/;\s*(?!\n)/g, ';\n');
			if(path == current.activeElement) li.classList.add('selected');

			li.addEventListener('click', event => {
				if(event.target == textarea) return;
				if(!UI.body.classList.contains('visual-editor')) return;
				else if(li.classList.contains('selected')) UI.selectPath(null);
				else UI.selectPath(path, li);
			});
			textarea.addEventListener('input', () => {
				const style = textarea.value.replace(/;\s*/g, ';').replace(/:\s+/g, ':');
				current.activeElement.setAttribute('style', style);
			});

			li.appendChild(span);
			li.appendChild(textarea);
			UI.allPaths.appendChild(li);
		}
	},
	throwError: function(text){
		UI.error.textContent = text;
		clearTimeout(UI.throwError.timeoutID);
		UI.throwError.timeoutID = setTimeout(() => {
			UI.error.classList.remove('shown');
		}, options.errorTimeShown);
		UI.error.classList.add('shown');
	},
	setPreviewSize: function(){
		const size = current.getSize();
		const aspectRatio = size.height / size.width;
		UI.preview.setAttribute('data-width', size.width);
		UI.preview.setAttribute('data-height', size.height);
		UI.preview.style.setProperty('--aspect-ratio', aspectRatio);
		UI.bubbles.setAttribute('viewBox', UI.product.getAttribute('viewBox'));
	},
	createBubble: function(x, y){
		const NS = 'http://www.w3.org/2000/svg';
		const circle = document.createElementNS(NS, 'circle');
		const zoom = UI.preview.getAttribute('data-width') / parseFloat(getComputedStyle(UI.preview).width);
		circle.setAttribute('cx', x);
		circle.setAttribute('cy', y);
		circle.setAttribute('r', options.bubbleSize * zoom * .5);
		return circle;
	},
	setBubbles: function(){
		while(UI.bubbles.firstChild) UI.bubbles.removeChild(UI.bubbles.lastChild);
		UI.hideBubbleInfo();
		if(!current.activeElement) return;
		const path = current.path;
		const points = path.getPoints();
		UI.allBubbles = [];
		const bubble = point => {
			const circle = UI.createBubble(point.x, point.y);
			const bubble = {
				element: circle,
				point: point
			};
			UI.allBubbles.push(bubble);
			circle.addEventListener('mousedown', event => {
				if(event.button != LEFT_MOUSE_BUTTON) return;
				UI.dragging = true;
				UI.currentBubble = bubble;
				UI.setActiveBubble();
				UI.showBubbleInfo();
			});
			return circle;
		};
		for(const point of points){
			UI.bubbles.appendChild(bubble(point));
		}
	},
	setActiveBubble: function(){
		for(const circle of UI.bubbles.querySelectorAll('circle')) circle.removeAttribute('class');
		UI.currentBubble.element.setAttribute('class', 'active');
	},
	resetBubblePosition: function(){
		if(!UI.allBubbles.length) return;
		const path = current.path;
		const points = path.getPoints();
		UI.allBubbles.forEach((bubble, ind) => {
			bubble.element.setAttribute('cx', points[ind].x);
			bubble.element.setAttribute('cy', points[ind].y);
		});
	},
	resetBubbleSize: function(){
		const zoom = UI.preview.getAttribute('data-width') / parseFloat(getComputedStyle(UI.preview).width);
		for(const circle of UI.bubbles.querySelectorAll('circle')){
			circle.setAttribute('r', options.bubbleSize * zoom * .5);
		}
	},
	removeBubbles: function(){
		UI.selectPeekCommand();
		while(UI.bubbles.firstChild) UI.bubbles.removeChild(UI.bubbles.lastChild);
		UI.hideBubbleInfo();
	},
	removeCreatingBubbles: function(){
		for(const g of UI.bubbles.querySelectorAll('g')) g.remove();
	},
	moveCreatingBubbles: function(){
		const g = UI.bubbles.querySelector('g');
		while(g.firstChild){
			const circle = g.firstChild;
			circle.addEventListener('mousedown', event => {
				if(event.button != LEFT_MOUSE_BUTTON) return;
				UI.dragging = true;
				UI.currentBubble = {
					element: circle,
					point: current.path.point
				};
				UI.setActiveBubble();
				UI.showBubbleInfo();
			});
			UI.bubbles.appendChild(circle);
		}
		g.remove();
	},
	showBubbleInfo: function(){
		UI.bubbleInfo.classList.remove('hidden');
		const point = UI.currentBubble.point;
		const item = point.item;
		const command = item.absolute ? item.command : item.command.toLowerCase();
		const options = point.options || [];
		UI.bubbleCommand.textContent = command;
		UI.bubbleOptions.empty();
		options.forEach((option, i) => {
			const li = document.createElement('li');
			const input = document.createElement('input');
			input.value = option;
			input.addEventListener('input', () => {
				const value = parseFloat(input.value);
				if(isNaN(value)) return;
				options[i] = value;
				current.path.setOptions(point.item.index, options);
			});
			li.appendChild(input);
			UI.bubbleOptions.appendChild(li);
		});
	},
	hideBubbleInfo: function(){
		UI.bubbleInfo.classList.add('hidden');
	},
	selectPeekCommand: function(){
		for(const li of UI.peekCommands.children){
			li.classList.toggle('selected', li.textContent == current.creating);
		}
	},
	stopCreatingCommand: function(){
		UI.peekCommands.classList.add('hidden');
		current.creating = false;
		UI.selectPeekCommand();
		UI.removeCreatingBubbles();
		if(current.path) UI.setBubbles();
	},
	createCommand: function(command){
		if(!current.path) return;
		UI.peekCommands.classList.remove('hidden');
		if(command == 'Z'){
			current.path.addPoint('Z');
			return;
		}
		current.creating = command;
		current.creatingData = [];
		UI.selectPeekCommand();
		const NS = 'http://www.w3.org/2000/svg';
		const g = document.createElementNS(NS, 'g');
		const circle = UI.createBubble(UI.mouse.x, UI.mouse.y);
		UI.currentBubble = {element: circle};
		UI.setActiveBubble();
		UI.removeCreatingBubbles();
		g.appendChild(circle);
		UI.bubbles.appendChild(g);
	}
}