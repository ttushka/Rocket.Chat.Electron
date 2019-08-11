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

export default {
	emit,
	connect,
};
