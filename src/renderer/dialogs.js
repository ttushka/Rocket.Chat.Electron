import { remote } from 'electron';


const { dialog, getCurrentWindow } = remote;

export const showMessageBox = (options) => new Promise((resolve, reject) => {
	const promise = dialog.showMessageBox(getCurrentWindow(), options, (response, checkboxChecked) => {
		resolve({
			response,
			checkboxChecked,
		});
	});

	if (promise && promise.then) {
		return promise.then(resolve, reject);
	}
});

export const showErrorBox = (title, message) => {
	dialog.showErrorBox(title, message);
};

export const showOpenDialog = (options) => new Promise((resolve, reject) => {
	const promise = dialog.showOpenDialog(getCurrentWindow(), options, (filePaths, bookmarks) => {
		resolve({
			canceled: typeof filePaths === 'undefined',
			filePaths: filePaths || [],
			bookmarks,
		});
	});

	if (promise && promise.then) {
		return promise.then(resolve, reject);
	}
});
