const UI = {
	dragging: false,
	setup: function(){
		document.getElementById('side-panel').style.display='none';
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
			const textarea = document.querySelector('textarea');
			let timeoutID;
			textarea.addEventListener('input', () => {
				clearTimeout(timeoutID);
				timeoutID = setTimeout(() => {
					try{
						current.setSVGFromText(textarea.value);
						current.save();
					} catch(error){ }
				}, options.editDelay);
			});
		})();

		// setup UI.drag
		(() => {
			document.addEventListener('mousemove', event => {
				if(!UI.dragging) return;
				if(!UI.dragging.mousemove) return;
				const {x, y} = UI.getPositionInSVG(event.clientX, event.clientY);
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
				UI.dragging = false;
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
				const delta = Math.sign(event.deltaY);
				if(event.deltaY < 0) zoom *= 0.9;
				if(event.deltaY > 0) zoom *= 1.1;
				zoom = clamp(zoom, 0.01, 10000); 
				preview.style.width = 100 * zoom + '%';
			});
		})();

		// set "tab" on textarea
		(() => {
			const textarea = document.querySelector('textarea');
			textarea.addEventListener('keydown', event => {
				if(event.key == 'Tab'){
					event.preventDefault();
					const position = textarea.selectionStart;
					if(position === undefined) return;
					textarea.value = textarea.value.slice(0, position)
						+ '\t'
						+ textarea.value.slice(position);
					textarea.selectionStart = position + 1;
					textarea.selectionEnd = position + 1;
				}
			});
		})();

		// set save behavior
		(() => {
			const textarea = document.querySelector('textarea');
			const body = document.querySelector('body');
			document.addEventListener('keydown', event => {
				if(event.key == 's' && event.ctrlKey){
					event.preventDefault();
					const error = current.SVGParseError(textarea.value);
					if(error) UI.throwError('Couldn\'t save, ' + error);
					else current.save();
				}
			});
		})();

		// set keyboard shortcuts
		(() => {
			document.addEventListener('keydown', event => {
				if(event.key == 'Delete'){
					if(current.activeElement && current.activeBubble){
						UI.bubble.remove(current.activeBubble);
					}
				}
			});
		})();
	},
	swapTo: function(editor){
		const textarea = document.querySelector('#text-editor textarea');
		const body = document.querySelector('body');

		body.classList.remove('visual-editor');
		body.classList.remove('terminal');

		if(editor == 'text'){
			const bubbles = document.getElementById('bubbles');
			textarea.value = current.getSVGAsText();
			UI.bubble.removeAll();
		}
		else if(editor == 'visual'){
			try { current.setSVGFromText(textarea.value); }
			catch(error){ return UI.throwError(error); }
			body.classList.add('visual-editor');

			// set the bubbles size
			(() => {
				const {width, height} = current.size;
				bubbles.setAttribute('viewBox', `0 0 ${width} ${height}`);
			})();

			// load SVG element event handlers
			(() => {
				for(const path of current.SVG.querySelectorAll('path')){
					UI.drag({
						element: path,
						button: LEFT_MOUSE_BUTTON,
						mousedown: event => {
							UI.select(path);
						},
						mousemove: event => {
							const {dx, dy} = UI.dragging.mouse;
							current.activeElement.moveBy(dx, dy);
							UI.bubble.moveAllBy(dx, dy)
						}
					})
				}
			})();
		}
		else if(editor == 'terminal'){
			body.classList.add('terminal');
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
		obj.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
		obj.element.addEventListener('mousedown', event => {
			if(obj.button !== undefined && obj.button != event.button) return;
			UI.dragging = obj;
			if(!UI.dragging.mousedown) return;
			const {x, y} = UI.getPositionInSVG(event.clientX, event.clientY);
			UI.dragging.mouse.x = x;
			UI.dragging.mouse.y = y;
			UI.dragging.mousedown(event);
		});
	},
	getPositionInSVG: function(x, y){
		const snap = x => options.snap * Math.round(x / options.snap);
		const rect = current.SVG.getBoundingClientRect();
		const size = current.size;
		return {
			x: snap((x - (rect.left || rect.x)) / rect.width * size.width),
			y: snap((y - (rect.top || rect.y)) / rect.height * size.height)
		};
	},
	select: function(element){
		if(element.tagName == 'path'){
			current.activeElement = new Path(element);
			UI.bubble.createAll();
			return;
		}
		current.activeElement = null;
	},
	bubble: {
		createAll: function(){
			UI.bubble.removeAll();
			if(!current.activeElement) return;
			const points = current.activeElement.getPoints();
			points.forEach(point => {
				UI.bubble.create(point);
			});
		},
		removeAll: function(){
			const bubbles = document.getElementById('bubbles');
			while(bubbles.firstChild) bubbles.removeChild(bubbles.lastChild);
			current.bubbles = [];
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
			UI.drag({
				element: circle,
				mousedown: event => {
					UI.bubble.select(circle);
				},
				mousemove: event => {
					const {x, y} = UI.dragging.mouse;
					if(point.axis == 'x' || point.axis == 'both') circle.setAttribute('cx', x);
					if(point.axis == 'y' || point.axis == 'both') circle.setAttribute('cy', y);
					current.activeElement.setPoint(point.id, x, y);
					UI.bubble.resetAll();
				}
			});
			current.bubbles.push(circle);
		},
		remove: function(circle){
			const id = current.bubbles.indexOf(circle);
			if(id == 0) return UI.throwError('Cannot remove the first command');
			const oldPoints = current.activeElement.getPoints();
			const index = oldPoints[id].item.index - 1;
			UI.bubble.removeAll();
			current.activeElement.removePoint(id);
			UI.bubble.createAll();
			const newPoints = current.activeElement.getPoints();
			const point = newPoints.find(point => point.item.index == index);
			if(!point) return console.log(index, newPoints);
			UI.bubble.select(current.bubbles[point.id]);
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
			current.activeBubble = element;
			for(const circle of current.bubbles){
				circle.classList.remove('active');
			}
			current.activeBubble.classList.add('active');
		},
		resetAll: function(){
			const points = current.activeElement.getPoints();
			points.forEach((point, id) => {
				const circle = current.bubbles[id];
				circle.setAttribute('cx', point.x);
				circle.setAttribute('cy', point.y);
			});
		}
	}
};