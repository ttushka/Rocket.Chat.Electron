import { remote } from 'electron';


const { dialog, getCurrentWindow } = remote;

export const showMessageBox = (options) => new Promise((resolve, reject) => {
	const promise = dialog.showMessageBox(getCurrentWindow(), options, (response, checkboxChecked) => {
		resolve({ response, checkboxChecked });
	});

	if (promise && promise.catch) {
		promise.catch(reject);
	}
});
