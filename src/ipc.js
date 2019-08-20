import { ipcMain, ipcRenderer, webContents } from 'electron';


const emit = (endpoint, ...args) => {
	if (ipcMain) {
		webContents.getAllWebContents().forEach((webContents) => {
			webContents.send(endpoint, ...args);
		});

		ipcMain.emit(endpoint, null, ...args);

		return;
	}

	ipcRenderer.send(endpoint, ...args);
	ipcRenderer.sendToHost(endpoint, ...args);
	ipcRenderer.emit(endpoint, null, ...args);
};

const connect = (endpoint, listener) => {
	const handler = (event, ...args) => {
		listener(...args);
	};

	const ipc = ipcMain || ipcRenderer;

	ipc.addListener(endpoint, handler);

	const disconnect = () => {
		ipc.removeListener(endpoint, handler);
	};

	if (ipcRenderer) {
		window.addEventListener('beforeunload', disconnect, false);
	}

	return disconnect;
};

const request = (endpoint, ...args) => {
	const reqId = Math.random().toString(16).slice(2);

	const promise = new Promise((resolve) => {
		const disconnect = connect(`${ endpoint }/response`, (resId, ...args) => {
			if (resId !== reqId) {
				return;
			}

			disconnect();
			resolve(args);
		});
	});

	emit(endpoint, reqId, ...args);

	return promise;
};

const reply = (endpoint, reqId, ...args) => {
	emit(`${ endpoint }/response`, reqId, ...args);
};

export default {
	emit,
	connect,
	request,
	reply,
};
