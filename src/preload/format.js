import { ipcRenderer } from 'electron';


const formatButtonTouched = (buttonId) => {
	let button = document.querySelector(`.js-format[data-id="${ buttonId }"]`);

	if (!button) {
		const legacyButtonIconClass = {
			bold: 'bold',
			italic: 'italic',
			strike: 'strike',
			inline_code: 'code',
			multi_line: 'multi-line',
		}[buttonId];
		const svg = document.querySelector(`.js-md svg[class$="${ legacyButtonIconClass }"]`);
		button = svg && svg.parentNode;
	}
	button && button.click();
};

export default () => {
	ipcRenderer.on('format', (event, buttonId) => {
		formatButtonTouched(buttonId);
	});
};
