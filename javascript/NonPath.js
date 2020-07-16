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
		if(this.type == 'circle'){
			this.element.setAttribute('cx', this.data.cx);
			this.element.setAttribute('cy', this.data.cy);
			this.element.setAttribute('r', this.data.r);			
		}
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
	static getDefault(tag, size){
		const NS = 'http://www.w3.org/2000/svg';
		const element = document.createElementNS(NS, tag);
		const [x, y] = [Math.round(size.left + (size.width / 2)), Math.round(size.top + (size.height / 2))];
		const [w, h] = [size.width, size.height];
		if(tag == 'circle'){
			element.setAttribute('cx', x);
			element.setAttribute('cy', y);
			element.setAttribute('r', Math.round(Math.min(w / 4, h / 4)));
			element.setAttribute('style', options.defaultNonPathStyle);
		}
		else if(tag == 'rect'){
			element.setAttribute('x', Math.round(x - w / 4));
			element.setAttribute('y', Math.round(y - h / 4));
			element.setAttribute('width', Math.round(w / 2));
			element.setAttribute('height', Math.round(h / 2));
			element.setAttribute('style', options.defaultNonPathStyle);
		}
		return element;
	};
	getPoints(){
		if(this.type == 'circle'){
			return [
				{x: this.data.cx, y: this.data.cy, axis: "both", id: 0},
				{x: this.data.cx + this.data.r, y: this.data.cy, axis: "x", id: 1}
			];
		}
		else if(this.type == 'rect'){
			return [
				{x: this.data.x, y: this.data.y, axis: "both", id: 0},
				{x: this.data.x + this.data.width, y: this.data.y + this.data.height, axis: "both", id: 1}
			]
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
				console.log(this.data);
			}
			else if(ID == 1){
				const [X, Y] = [this.data.x, this.data.y];
				const [X1, Y1, X2, Y2] = [X, Y, x, y];
				this.data = {x: X1, y: Y1, width: X2 - X1, height: Y2 - Y1};
			}
		}
		this._update();
	}
};

NonPath.support = ['circle', 'rect'];

NonPath.attributes = {
	'circle': ['cx', 'cy', 'r'],
	'rect': ['x', 'y', 'width', 'height']
};