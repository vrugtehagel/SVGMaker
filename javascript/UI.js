const UI = {
	dragging: false,
	_textarea: null,
	setup: function(){
		UI._textarea = document.querySelector('textarea');
		// set events to swapTo a different editor
		(() => {
			const visualEditor = document.getElementById('visual-editor');
			const editButton = document.getElementById('edit-button');

			document.addEventListener('keydown', event => {
				if(event.key == 'F1'){
					event.preventDefault();
					if(current.editor == 'terminal') return UI.swapTo('text');
					else return UI.swapTo('terminal');
				}
			});
			visualEditor.addEventListener('click', event => {
				if(current.editor != 'text') return;
				UI.swapTo('visual');
			});
			editButton.addEventListener('click', event => {
				event.stopPropagation();
				UI.swapTo('text');
			});
		})();

		// update svg when textarea is being edited
		(() => {
			let timeoutID;
			UI._textarea.addEventListener('input', () => {
				clearTimeout(timeoutID);
				timeoutID = setTimeout(() => {
					try{
						current.setSVGFromText(UI._textarea.value);
						current.save({onlyLocalStorage: true});
					} catch(error){ }
				}, options.editDelay);
			});
		})();

		// resize text-editor's textarea when overflow occurs
		(() => {
			const textEditor = document.getElementById('text-editor');
			let timeoutID;
			let resize = () => {
				const vh = window.innerHeight;
				const scrollTop = textEditor.scrollTop;
				UI._textarea.style.height = '0px';
				const newHeight = .5 * vh + UI._textarea.scrollHeight;
				UI._textarea.style.height = Math.max(vh, newHeight) + 'px';
				textEditor.scrollTo(0, scrollTop);
			};
			resize();
			UI._textarea.addEventListener('input', resize);
		})();

		// setup UI.drag
		(() => {
			document.addEventListener('mousemove', event => {
				if(!UI.dragging) return;
				if(!UI.dragging.mousemove) return;
				event.preventDefault();
				const {x, y} = UI.SVG.getMousePosition(event.clientX, event.clientY);
				mx = UI.dragging.mouse.x;
				my = UI.dragging.mouse.y;
				UI.dragging.mouse.dx = x - mx;
				UI.dragging.mouse.dy = y - my;
				UI.dragging.mousemove(event);
				UI.dragging.mouse.x = x;
				UI.dragging.mouse.y = y;
			});
			document.addEventListener('mouseup', event => {
				if(!UI.dragging) return;
				if(UI.dragging.mouseup) UI.dragging.mouseup(event);
				if(!UI.dragging.overrideDragging) UI.dragging = false;
			});
		})();

		// set the drag & zoom on the preview
		(() => {
			const preview = document.getElementById('preview');
			const visualEditor = document.getElementById('visual-editor');
			const clamp = (n, min, max) => n < min ? min : n > max ? max : n;
			let sx, sy, mx, cx, cy, my, W, H;
			let zoom = .5;

			UI.drag({
				element: visualEditor,
				button: RIGHT_MOUSE_BUTTON,
				mousedown: event => {
					event.preventDefault();
					const rect = preview.getBoundingClientRect();
					const bigRect = visualEditor.getBoundingClientRect();
					[cx, cy] = [bigRect.left || bigRect.x, bigRect.top || bigRect.y];
					[sx, sy] = [(rect.left || rect.x) - cx, (rect.top || rect.y) - cy];
					[mx, my] = [event.clientX - cx - sx - .5 * rect.width, event.clientY - cy - sy - .5 * rect.height];
					[W, H] = [bigRect.width, bigRect.height];					
				},
				mousemove: event => {
					const left = 100 * (event.clientX - cx - mx) / W;
					const top = 100 * (event.clientY - cy - my) / H;
					preview.style.left = clamp(left, 0, 100) + '%';
					preview.style.top = clamp(top, 0, 100) + '%';
				}
			});

			document.addEventListener('contextmenu', event => event.preventDefault());

			document.addEventListener('wheel', event => {
				if(!visualEditor.contains(event.target)) return;
				const delta = Math.sign(event.deltaY);
				if(event.deltaY < 0) zoom *= 0.9;
				if(event.deltaY > 0) zoom *= 1.1;
				zoom = clamp(zoom, 0.01, 10000); 
				preview.style.width = 100 * zoom + '%';
				if(current.activeElement) UI.bubbles.resetSize();
			});
		})();

		// set keyboard keyboard "shortcuts" on textarea
		(() => {
			const textarea = UI._textarea;
			const insertAtCaret = text => {
				const position = textarea.selectionStart;
				if(position === undefined) return;
				textarea.value = textarea.value.slice(0, position)
					+ text
					+ textarea.value.slice(position);
				textarea.selectionStart = position + text.length;
				textarea.selectionEnd = position + text.length;
			};
			textarea.addEventListener('keydown', event => {
				if(event.key == 'Tab'){
					event.preventDefault();
					insertAtCaret(options.indentation);
				}
			});
		})();

		// set save behavior
		(() => {
			document.addEventListener('keydown', event => {
				if(event.key == 's' && event.ctrlKey){
					event.preventDefault();
					const error = current.SVGParseError(UI._textarea.value);
					if(error) UI.throwError('Couldn\'t save, ' + error);
					else current.save();
				}
			});
		})();

		// set keyboard shortcuts
		(() => {
			document.addEventListener('keydown', event => {
				const key = event.key.toUpperCase();
				if(key == 'DELETE' || (event.altKey && key == 'BACKSPACE')){
					if(current.activeBubble && current.activeElement?.type == 'path') UI.bubbles.remove();
					else if(current.activeElement) UI.SVG.remove();
				}
				else if(event.ctrlKey && key == 'Z'){
					if(current.editor != 'visual') return;
					event.preventDefault();
					UI.set(current.undo);
				}
				else if(event.ctrlKey && key == 'Y'){
					if(current.editor != 'visual') return;
					event.preventDefault();
					UI.set(current.redo);
				}
				else if(Path.commands.hasOwnProperty(key) && current.activeElement?.type == 'path'){
					if(current.activeBubble) UI.bubbles.insert(key);
				}
			});
		})();

		// set selecting elements is done in swapTo
		(() => {
			const visualEditor = document.getElementById('visual-editor');
			visualEditor.addEventListener('mousedown', event => {
				if(UI.dragging) return;
				if(event.target == visualEditor || event.target == current.SVG) UI.SVG.select(null);
				else if(current.SVG.contains(event.target)) UI.SVG.select(event.target);
			});
		})();

		// set the absolute/relative toggle on #bubble-command
		(() => {
			const bubbleCommand = document.getElementById('bubble-command');
			bubbleCommand.addEventListener('click', () => {
				const circle = current.activeBubble;
				if(!circle) return;
				const id = current.bubbles.indexOf(circle);
				const item = current.activeElement.getItemByPoint(id);
				const value = current.activeElement.toggleAbsolute(item.index);
				if(value) bubbleCommand.textContent = item.command;
				else bubbleCommand.textContent = item.command.toLowerCase();
			});
		})();

		// set insert-bubble and remove-bubble functionality
		(() => {
			const insertButtons = document.getElementById('insert-command').children;
			for(const insertButton of insertButtons){
				insertButton.addEventListener('click', () => {
					const command = insertButton.getAttribute('data-insert');
					UI.bubbles.insert(command);
				});
			}

			const removeButton = document.getElementById('remove-command');
			removeButton.addEventListener('click', () => {
				UI.bubbles.remove();
			});
		})();

		// set the action buttons (other than the swap editor one)
		(() => {
			const actionButtons = document.querySelectorAll('#actions li[data-action]');
			for(const button of actionButtons){
				button.addEventListener('click', () => {
					const attr = button.getAttribute('data-action').split(' ');
					const action = attr[0];
					const args = attr.slice(1);
					UI.SVG[action](...args);
				});
			}
		})();

		// set coordinates on mouseover
		(() => {
			const visualEditor = document.getElementById('visual-editor');
			const span = document.getElementById('mouse-coordinates');
			document.addEventListener('mousemove', event => {
				const {x, y} = UI.SVG.getMousePosition(event.clientX, event.clientY);
				UI.setMouseCoordinates(x, y);
			});
		})();

		// set title attribute on the insert command buttons
		(() => {
			const buttons = document.getElementById('insert-command').children;
			for(const button of buttons){
				const command = button.getAttribute('data-insert');
				const description = Path.commandDescriptions[command];
				button.setAttribute('title', description);
			}
		})();
	},
	swapTo: function(editor){
		document.body.classList.remove('visual-editor');
		document.body.classList.remove('terminal');
		UI.dragging = false;
		
		if(editor == 'text'){
			UI._textarea.value = current.getSVGAsText();
			UI.SVG.select(null);
		}
		else if(editor == 'visual'){
			try { current.setSVGFromText(UI._textarea.value); }
			catch(error){ return UI.throwError(error); }
			document.body.classList.add('visual-editor');

			UI.SVG.setup();
		}
		else if(editor == 'terminal'){
			document.body.classList.add('terminal');
			document.querySelector('#terminal input').focus();
		}
		current.editor = editor;
	},
	throwError: function(text){
		const element = document.getElementById('error');
		element.textContent = text;
		clearTimeout(UI.throwError.timeoutID);
		UI.throwError.timeoutID = setTimeout(() => {
			element.classList.remove('shown');
		}, options.errorTimeShown);
		element.classList.add('shown');
	},
	drag: function(obj){
		//	obj: {
		//		mouse: { x, y, dx, dy } (readonly)
		//		element
		//		mousdown
		//		mousemove
		//		mouseup
		//	}
		obj.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
		obj.element.addEventListener('mousedown', event => {
			if(obj.button !== undefined && obj.button != event.button) return;
			if(UI.dragging) return;
			UI.dragging = obj;
			if(!UI.dragging.mousedown) return;
			const {x, y} = UI.SVG.getMousePosition(event.clientX, event.clientY);
			UI.dragging.mouse.x = x;
			UI.dragging.mouse.y = y;
			UI.dragging.mousedown(event);
		});
	},
	setMouseCoordinates: function(x, y){
		if(!UI.setMouseCoordinates.element) UI.setMouseCoordinates.element = document.getElementById('mouse-coordinates');
		const span = UI.setMouseCoordinates.element;
		if(!current.activeElement || x == null){
			span.textContent = '';
			span.setAttribute('hidden', '');
		}
		else {
			span.textContent = `(${x}, ${y})`;
			span.removeAttribute('hidden');
			span.classList.toggle('right', current.size.width / 2 > x);
		}
	},
	toggleTitleAttributes: function(bool){
		if(bool === undefined) bool = !document.querySelector('[title]');
		if(bool){
			const titleElements = document.querySelectorAll('[data-title]');
			for(const titleElement of titleElements){
				const title = titleElement.getAttribute('data-title');
				titleElement.setAttribute('title', title);
				titleElement.removeAttribute('data-title');
			}
		}
		else{
			const titleElements = document.querySelectorAll('[title]');
			for(const titleElement of titleElements){
				const title = titleElement.getAttribute('title');
				titleElement.setAttribute('data-title', title);
				titleElement.removeAttribute('title');
			}
		}
	},
	set: function(callback){
		// save currently selected items
		// run callback
		// restor selected items
		// meant for current.redo and current undo
		const rememberBubble = !!current.activeBubble;
		let allElements = Array.from(current.SVG.querySelectorAll('*'));
		let elementIndex = allElements.indexOf(current.activeElement?.element);
		let bubbleIndex = current.bubbles.indexOf(current.activeBubble);
		callback();
		UI.SVG.setup();
		allElements = current.SVG.querySelectorAll('*');
		if(elementIndex >= allElements.length) elementIndex = -1;
		if(elementIndex != -1) UI.SVG.select(allElements[elementIndex]);
		if(bubbleIndex >= current.bubbles.length) bubbleIndex = -1;
		if(bubbleIndex != -1) UI.bubbles.select(current.bubbles[bubbleIndex]);
	},
	SVG: {
		setup: function(){
			const viewBox = current.SVG.getAttribute('viewBox');
			if(viewBox) bubbles.setAttribute('viewBox', viewBox);
			else bubbles.setAttribute('viewBox', `0 0 ${current.size.width} ${current.size.height}`);
			const elements = current.SVG.querySelectorAll('*');
			for(const element of elements){
				if(element.tagName == 'path' || NonPath.support.includes(element.tagName)) UI.SVG.setDrag(element);
			}
		},
		getMousePosition(x, y){
			const decimals = options.snap.toString().split('.')[1]?.length;
			const roundTo = (x, d) => d ? Math.round(x * 10 ** d) / 10 ** d : x;
			const snap = x => roundTo(options.snap * Math.round(x / options.snap), decimals);
			const rect = current.SVG.getBoundingClientRect();
			const size = current.size;
			return {
				x: size.left + snap((x - (rect.left || rect.x)) / rect.width * size.width),
				y: size.top + snap((y - (rect.top || rect.y) ) / rect.height * size.height)
			};
		},
		select: function(element){
			const removeButton = document.getElementById('remove-element');
			if(!element){
				current.activeElement = null;
				UI.setMouseCoordinates(null);
				UI.bubbles.removeAll();
				removeButton.setAttribute('hidden', '');
				return;
			}
			if(element.tagName == 'path') current.activeElement = new Path(element);
			else if(NonPath.support.includes(element.tagName)) current.activeElement = new NonPath(element);
			else return UI.SVG.select(null);
			removeButton.removeAttribute('hidden');
			UI.bubbles.createAll();
		},
		selectPrevious: function(){
			const query = 'path,' + NonPath.support.join(',');
			const elements = Array.from(current.SVG.querySelectorAll(query));
			let index = elements.indexOf(current.activeElement?.element);
			if(index < 1) index = elements.length - 1;
			else index--;
			UI.SVG.select(elements[index]);
		},
		selectNext: function(){
			const query = 'path,' + NonPath.support.join(',');
			const elements = Array.from(current.SVG.querySelectorAll(query));
			let index = elements.indexOf(current.activeElement?.element);
			if(index == elements.length - 1) index = 0;
			else index++;
			UI.SVG.select(elements[index]);
		},
		remove: function(){
			if(!current.activeElement) return;
			const query = 'path,' + NonPath.support.join(',');
			const element = current.activeElement.element;
			const elements = Array.from(current.SVG.querySelectorAll(query));
			let index = elements.indexOf(element);
			if(index == elements.length - 1) index--;
			else index++;
			UI.SVG.select(elements[index]);
			element.remove();
			current.save();
		},
		add: function(tag){
			const size = current.size;
			let element = tag == 'path' ? Path.getDefault(size) : NonPath.getDefault(tag, size);
			current.SVG.appendChild(element);
			UI.SVG.select(element);
			UI.SVG.setDrag(element);
			current.save();
		},
		setDrag: function(element){
			UI.drag({
				element: element,
				button: LEFT_MOUSE_BUTTON,
				mousedown: event => {
					UI.SVG.select(element);
					const {x, y} = UI.SVG.getMousePosition(event.clientX, event.clientY);
					UI.setMouseCoordinates(x, y);
				},
				mousemove: event => {
					const {dx, dy} = UI.dragging.mouse;
					current.activeElement.moveBy(dx, dy);
					UI.bubbles.moveAllBy(dx, dy);
				},
				mouseup: current.save
			});
		}
	},
	bubbles: {
		createAll: function(){
			UI.bubbles.removeAll();
			if(!current.activeElement) return;
			const points = current.activeElement.getPoints();
			points.forEach(point => {
				UI.bubbles.create(point);
			});
		},
		setDrag(point){
			const circle = current.bubbles[point.id];
			UI.drag({
				element: circle,
				mousedown: event => {
					UI.bubbles.select(circle);
				},
				mousemove: event => {
					const {x, y} = UI.dragging.mouse;
					if(point.axis == 'x' || point.axis == 'both') circle.setAttribute('cx', x);
					if(point.axis == 'y' || point.axis == 'both') circle.setAttribute('cy', y);
					current.activeElement.setPoint(point.id, x, y);
					UI.bubbles.resetAll();
				},
				mouseup: current.save
			});
		},
		removeAll: function(){
			const bubbles = document.getElementById('bubbles');
			while(bubbles.firstChild) bubbles.removeChild(bubbles.lastChild);
			current.bubbles = [];
			UI.bubbles.select(null);
			UI.bubbles.setInfo();
		},
		create: function(point){
			const NS = 'http://www.w3.org/2000/svg';
			const circle = document.createElementNS(NS, 'circle');
			const preview = document.getElementById('preview');
			const bubbles = document.getElementById('bubbles');
			const zoom = current.size.width / parseFloat(getComputedStyle(preview).width);
			circle.setAttribute('cx', point.x);
			circle.setAttribute('cy', point.y);
			circle.setAttribute('r', options.bubbleSize * zoom / 2);
			bubbles.appendChild(circle);
			current.bubbles.push(circle);
			UI.bubbles.setDrag(point);
		},
		remove: function(){
			if(!current.activeBubble) return;
			const circle = current.activeBubble;
			const id = current.bubbles.indexOf(circle);
			if(id == 0) return UI.throwError('Cannot remove the first command');
			const oldPoints = current.activeElement.getPoints();
			const index = oldPoints[id].item.index - 1;
			UI.bubbles.removeAll();
			current.activeElement.removePoint(id);
			UI.bubbles.createAll();
			current.save();
			const newPoints = current.activeElement.getPoints();
			const point = newPoints.reverse().find(point => point.item.index == index);
			if(!point) return;
			UI.bubbles.select(current.bubbles[point.id]);
		},
		moveAllBy: function(dx, dy){
			for(const circle of current.bubbles){
				const cx = +circle.getAttribute('cx');
				const cy = +circle.getAttribute('cy');
				circle.setAttribute('cx', cx + dx);
				circle.setAttribute('cy', cy + dy);
			}
		},
		select: function(element){
			const editActions = document.getElementById('edit-actions');
			const removeButton = document.getElementById('remove-command');
			for(const circle of current.bubbles) circle.classList.remove('active');
			current.activeBubble = element;
			UI.bubbles.setInfo();
			if(current.activeBubble){
				current.activeBubble.classList.add('active');
				if(current.activeElement.type == 'path'){
					editActions.removeAttribute('hidden');
					if(current.bubbles.indexOf(current.activeBubble) == 0){
						removeButton.setAttribute('hidden', '');
					}
					else{
						removeButton.removeAttribute('hidden');
					}
				}
				else{
					editActions.setAttribute('hidden', '');
				}
			}
			else{
				editActions.setAttribute('hidden', '');
			}
		},
		setInfo: function(){
			if(current.activeElement?.tagName != 'path') return;
			const bubbleInfo = document.getElementById('bubble-info');
			const bubbleCommand = document.getElementById('bubble-command');
			const bubbleOptions = document.getElementById('bubble-options');
			const circle = current.activeBubble;
			if(!circle) return bubbleInfo.setAttribute('hidden', '');
			bubbleOptions.empty();
			bubbleInfo.removeAttribute('hidden');
			const id = current.bubbles.indexOf(circle);
			const item = current.activeElement.getItemByPoint(id);
			const index = item.index;
			const commandOptions = current.activeElement.getOptions(index);
			bubbleCommand.textContent = item.absolute ? item.command : item.command.toLowerCase();
			if(options.showTooltips) bubbleCommand.setAttribute('data-tooltip', Path.commandDescriptions[item.command]);
			else bubbleCommand.removeAttribute('data-tooltip');
			commandOptions.forEach((option, i) => {
				const li = document.createElement('li');
				const input = document.createElement('input');
				input.value = option;
				input.addEventListener('input', () => {
					const value = parseFloat(input.value);
					if(isNaN(value)) return;
					commandOptions[i] = value;
					current.activeElement.setOptions(index, commandOptions);
				});
				li.appendChild(input);
				bubbleOptions.appendChild(li);
			});
		},
		resetAll: function(){
			const points = current.activeElement.getPoints();
			points.forEach((point, id) => {
				const circle = current.bubbles[id];
				circle.setAttribute('cx', point.x);
				circle.setAttribute('cy', point.y);
			});
		},
		resetSize: function(){
			const points = current.activeElement.getPoints();
			const zoom = current.size.width / parseFloat(getComputedStyle(preview).width);
			points.forEach((point, id) => {
				const circle = current.bubbles[id];
				circle.setAttribute('r', options.bubbleSize * zoom / 2);
			});
		},
		insert: function(command){
			if(!current.activeBubble) return;
			const circle = current.activeBubble;
			const id = current.bubbles.indexOf(circle);
			const oldPoints = current.activeElement.getPoints();
			const index = oldPoints[id].item.index + 1;
			UI.bubbles.removeAll();
			current.activeElement.insertPointAt(command, id);
			UI.bubbles.createAll();
			const newPoints = current.activeElement.getPoints();
			const pointsToPlace = newPoints.filter(point => point.item.index == index);
			for(const point of pointsToPlace){
				const circle = current.bubbles[point.id];
				const newCircle = circle.cloneNode();
				circle.replaceWith(newCircle);
				current.bubbles[point.id] = newCircle;
			}
			const dragObj = i => {
				if(!pointsToPlace[i]){
					if(i == 0) return false;
					const point = pointsToPlace[i - 1];
					const circle = current.bubbles[point.id];
					pointsToPlace.forEach(point => UI.bubbles.setDrag(point));
					UI.bubbles.select(circle);
					current.save();
					return false;
				}
				const point = pointsToPlace[i];
				const circle = current.bubbles[point.id];
				return {
					element: circle,
					overrideDragging: true,
					mouse: {
						x: +circle.getAttribute('cx'),
						y: +circle.getAttribute('cy')
					},
					mousemove: event => {
						const {x, y} = UI.dragging.mouse;
						pointsToPlace.slice(i).forEach(point => {
							if(point.axis == 'x' || point.axis == 'both') circle.setAttribute('cx', x);
							if(point.axis == 'y' || point.axis == 'both') circle.setAttribute('cy', y);
							current.activeElement.setPoint(point.id, x, y);
						});
						UI.bubbles.resetAll();
					},
					mouseup: event => {
						UI.dragging = dragObj(i + 1);
					}
				}
			}
			UI.dragging = dragObj(0);
			//UI.bubbles.select(current.bubbles[point.id]);
		}
	}
};