// max name length: 32
const options = {
	editDelay: 300,
	errorTimeShown: 4000,
	bubbleSize: 24,
	snap: 1,
	defaultPathStyle: 'stroke:red;fill:none;',
	defaultNonPathStyle: 'fill: red;',
	theme: 'default',
	SVGOverflowVisible: false,
	showTooltips: true,
	showBrowserTooltips: true,
	maxHistoryMemory: 200000,
	autoFormatIndentation: true,
	indentation: '\t',
	invertZoom: false,
	chainCommands: true,
	removeEmptyPaths: true,
	setup: function(){
		const savedOptions = JSON.parse(localStorage.SVGMakerOptions || '{}');
		for(const [option, value] of Object.entries(savedOptions)) options.set(option, value);
	},
	save: function(){
		const savedOptions = {};
		for(const [option, value] of Object.entries(options)){
			if(typeof value == 'function') continue;
			savedOptions[option] = value;
		}
		localStorage.SVGMakerOptions = JSON.stringify(savedOptions);
	},
	set: function(option, value){
		options[option] = value;
		options.save();
		if(option == 'SVGOverflowVisible'){
			const preview = document.getElementById('preview');
			preview.classList.toggle('svg-overflow-visible', value);
		}
		else if(option == 'showBrowserTooltips'){
			UI.toggleTitleAttributes(value);
		}
		else if(option == 'theme'){
			document.body.setAttribute('data-theme', value);
		}
	},
}