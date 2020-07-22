class NonPath {
	constructor(element){
		this.element = element;
		this.type = element.tagName;
		this.data = {};
		if(!NonPath.attributes[this.type]) throw new Error('Invalid NonPath element: ' + element.tagName);
		NonPath.attributes[this.type].forEach(attribute => {
			this.data[attribute] = +element.getAttribute(attribute);
		});
	};
	_update(){
		const naiveSet = () => {
			NonPath.attributes[this.type].forEach(attribute => {
				this.element.setAttribute(attribute, this.data[attribute]);
			});
		};
		if(this.type == 'circle') naiveSet();
		else if(this.type == 'line') naiveSet();
		else if(this.type == 'ellipse') naiveSet();
		else if(this.type == 'rect'){
			const [x1, y1, x2, y2] = [
				this.data.x,
				this.data.y,
				this.data.x + this.data.width,
				this.data.y + this.data.height
			];
			this.element.setAttribute('x', Math.min(x1, x2));
			this.element.setAttribute('y', Math.min(y1, y2));
			this.element.setAttribute('width', Math.abs(x2 - x1) || 1);
			this.element.setAttribute('height', Math.abs(y2 - y1) || 1);
		}
	};
	static getDefault(tag, place){
		const NS = 'http://www.w3.org/2000/svg';
		const element = document.createElementNS(NS, tag);
		const {x, y, r} = place;
		if(tag == 'circle'){
			element.setAttribute('cx', x);
			element.setAttribute('cy', y);
			element.setAttribute('r', Math.round(r));
		}
		else if(tag == 'rect'){
			element.setAttribute('x', Math.round(x - r));
			element.setAttribute('y', Math.round(y - .75 * r));
			element.setAttribute('width', Math.round(2 * r));
			element.setAttribute('height', Math.round(1.5 * r));
		}
		else if (tag == 'line'){
			element.setAttribute('x1', Math.round(x - r));
			element.setAttribute('y1', Math.round(y - r));
			element.setAttribute('x2', Math.round(x + r));
			element.setAttribute('y2', Math.round(x + r));
		}
		else if (tag == 'ellipse'){
			element.setAttribute('cx', x);
			element.setAttribute('cy', y);
			element.setAttribute('rx', Math.round(r));
			element.setAttribute('ry', Math.round(r / 3 * 2));
		}
		element.setAttribute('style', options.defaultNonPathStyle);
		return element;
	};
	getPoints(){
		if(this.type == 'circle'){
			return [
				{x: this.data.cx, y: this.data.cy, id: 0},
				{x: this.data.cx + this.data.r, y: this.data.cy, id: 1}
			];
		}
		else if(this.type == 'rect'){
			return [
				{x: this.data.x, y: this.data.y, id: 0},
				{x: this.data.x + this.data.width, y: this.data.y + this.data.height, id: 1}
			];
		}
		else if(this.type == 'line'){
			return [
				{x: this.data.x1, y: this.data.y1, id: 0},
				{x: this.data.x2, y: this.data.y2, id: 1}
			];
		}
		else if(this.type == 'ellipse'){
			return [
				{x: this.data.cx, y: this.data.cy, id: 0},
				{x: this.data.cx + this.data.rx, y: this.data.cy, id: 1},
				{x: this.data.cx, y: this.data.cy + this.data.ry, id: 2}
			];
		}
	};
	moveBy(x, y){
		if(this.type == 'circle'){
			this.data.cx += x;
			this.data.cy += y;
		}
		else if(this.type == 'rect'){
			this.data.x += x;
			this.data.y += y;
		}
		else if(this.type == 'line'){
			this.data.x1 += x;
			this.data.y1 += y;
			this.data.x2 += x;
			this.data.y2 += y;
		}
		else if(this.type == 'ellipse'){
			this.data.cx += x;
			this.data.cy += y;
		}
		this._update();
	};
	setPoint(ID, x, y){
		if(this.type == 'circle'){
			if(ID == 0) this.data = {...this.data, cx: x, cy: y};
			else this.data.r = Math.abs(x - this.data.cx) || 1;
		}
		else if(this.type == 'rect'){
			if(ID == 0){
				const [X, Y] = [this.data.x + this.data.width, this.data.y + this.data.height];
				const [X1, Y1, X2, Y2] = [x, y, X, Y];
				this.data = {x: X1, y: Y1, width: X2 - X1, height: Y2 - Y1};
			}
			else if(ID == 1){
				const [X, Y] = [this.data.x, this.data.y];
				const [X1, Y1, X2, Y2] = [X, Y, x, y];
				this.data = {x: X1, y: Y1, width: X2 - X1, height: Y2 - Y1};
			}
		}
		else if(this.type == 'line'){
			if(ID == 0) this.data = {...this.data, x1: x, y1: y};
			else this.data = {...this.data, x2: x, y2: y};
		}
		else if(this.type == 'ellipse'){
			if(ID == 0) this.data = {...this.data, cx: x, cy: y};
			else if(ID == 1) this.data.rx = Math.abs(x - this.data.cx) || 1;
			else this.data.ry = Math.abs(y - this.data.cy) || 1;
		}
		this._update();
	}
};

NonPath.support = ['circle', 'rect', 'line', 'ellipse'];

NonPath.attributes = {
	'circle': ['cx', 'cy', 'r'],
	'rect': ['x', 'y', 'width', 'height'],
	'line': ['x1', 'y1', 'x2', 'y2'],
	'ellipse': ['cx', 'cy', 'rx', 'ry']
};