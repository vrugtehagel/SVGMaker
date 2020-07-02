const Path = class {
	constructor(path){
		this.element = path;
		this._parse(this.element.getAttribute('d'));
		this.onHold = [];
	};
	static commands = {
		'M': ['x', 'y'],
		'L': ['x', 'y'],
		'H': ['x'],
		'V': ['y'],
		'Z': [],
		'C': ['x', 'y', 'x', 'y', 'x', 'y'],
		'S': ['x', 'y', 'x', 'y'],
		'Q': ['x', 'y', 'x', 'y'],
		'T': ['x', 'y'],
		'A': ['o', 'o', 'o', 'o', 'o', 'x', 'y']
	};
	_parse(d){
		if(!d) return this.data = [];
		const data = d.split(/\s*\,\s*|\s+|(?<=[a-zA-Z])|(?=[a-zA-Z])/);
		let i = 0;
		this.data = data.filter(a => isNaN(a)).map((a, n) => ({
			command: a.toUpperCase(),
			data: data.slice(++i, i += Path.commands[a.toUpperCase()].length).map(b => +b),
			absolute: a.toLowerCase() != a,
			index: n
		}));
		let current = {x: 0, y: 0};
		let start = {x: 0, y: 0};
		this.data.forEach(item => {
			const commands = Path.commands[item.command];
			if(item.data.length != commands.length) throw Error('Invalid path data at Path._parse');
			const pt = {...current};
			item.data = item.data.map((num, ind) => {
				const role = commands[ind];
				return ind >= item.data.length - 2
					? item.absolute ? current[role] = num : current[role] += num
					: item.absolute || role == 'o' ? num : pt[role] + num;
			});
			if(item.command == 'M') start = {...current};
			if(item.command == 'Z') current = {...start};
		});
	};
	_stringify(data){
		let result = '';
		let current = {x: 0, y: 0};
		let start = {x: 0, y: 0};
		this.data.forEach(item => {
			const commands = Path.commands[item.command];
			result = result.slice(0, -1);
			result += item.absolute ? item.command : item.command.toLowerCase();
			const pt = {...current};
			item.data.forEach((num, ind) => {
				const role = commands[ind];
				if(item.absolute || role == 'o') result += num;
				else result += num - pt[role];
				result += ' ';
				current[role] = num;
			});
			if(item.command == 'M') start = {...current};
			if(item.command == 'Z') current = {...start};
		});
		return result;
	};
	getPoints(){
		let id = 0;
		const result = [];
		let current = {x: 0, y: 0};
		let start = {x: 0, y: 0};
		let options = [];
		this.data.forEach(item => {
			if(item.command == 'H'){
				current.x = item.data[0];
				result.push({...current, axis: 'x', id: id++, item: item});
				return;
			}
			if(item.command == 'V'){
				current.y = item.data[0];
				result.push({...current, axis: 'y', id: id++, item: item});
				return;
			}
			options = [];
			item.data.forEach((num, ind) => {
				if(Path.commands[item.command][ind] == 'o') return options.push(num);
				if(Path.commands[item.command][ind] != 'x') return;
				current.x = item.data[ind];
				current.y = item.data[ind + 1];
				if(options.length) result.push({...current, axis: 'both', id: id++, options: options, item: item});
				else result.push({...current, axis: 'both', id: id++, item: item});
			});
			if(item.command == 'Z') return current = {...start};
			if(item.command == 'M') return start = {...current};
		});
		return result;
	};
	setPoint(ID, x, y){
		let id = 0;
		this.data.forEach(item => {
			if(item.command == 'H') return ID == id++ && (item.data[0] = x);
			if(item.command == 'V') return ID == id++ && (item.data[0] = y);
			item.data.forEach((num, ind) => {
				if(Path.commands[item.command][ind] != 'x') return;
				if(id++ == ID){
					item.data[ind] = x;
					item.data[ind + 1] = y;
				}
			});
		});
		this.update();
	};
	removePoint(ID){
		if(ID < 0) return;
		let id = 0;
		let index = -1;
		for(const item of this.data){
			index++;
			if(item.command == 'H' || item.command == 'V'){
				if(ID == id){
					this.data.splice(index, 1);
					break;
				}
				id++;
				continue;
			}
			if(ID <= id){
				this.data.splice(index, 1);
				break;
			}
			id += Path.commands[item.command].filter(role => role == 'x').length;
		}
		this.update();
	};
	setOptions(index, options){
		let i = 0;
		this.data[index].data = this.data[index].data.map((num, ind) => {
			if(Path.commands[this.data[index].command][ind] == 'o') return options[i++];
			return num;
		});
		this.update();
	};
	toggleAbsolute(index, value){
		if(value === undefined) value = !this.data[index].absolute;
		this.data[index].absolute = value;
		this.update();
		return value;
	};
	update(){
		this.data.forEach((item, ind) => item.index = ind);
		this.element.setAttribute('d', this._stringify(this.data));
	};
	static getAmountOfPoints(command){
		const roles = Path.commands[command.toUpperCase()];
		return Math.round(roles.filter(r => r != 'o').length / 2);
	}
	addPoint(command, points = []){
		const previousCommand = this.data.length > 1 ? this.data[this.data.length - 1].command : '';
		if(command != 'M' && previousCommand == 'Z') this.data.pop();
		if(command == 'M' && previousCommand == 'M') this.data.pop();
		let i = 0;
		const data = (() => {
			const xs = points.map(point => point.x);
			const ys = points.map(point => point.y);
			return Array.from(Path.commands[command], val => {
				if(val == 'o') return 0;
				if(val == 'x') return xs.shift();
				if(val == 'y') return ys.shift();
			});
		})();
		this.data.push({
			command: command,
			data: data,
			absolute: true,
			index: this.data.length
		});
		this.update();
	};
	moveBy(x, y){
		this.data.forEach(item => {
			const commands = Path.commands[item.command];
			item.data = item.data.map((num, ind) => {
				if(commands[ind] == 'x') return num + x;
				if(commands[ind] == 'y') return num + y;
				return num;
			});
		});
		this.update();
	};
}