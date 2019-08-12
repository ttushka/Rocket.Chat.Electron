import { ipcRenderer } from 'electron';

export default () => {
	for (const eventName of ['unread-changed', 'get-sourceId']) {
		window.addEventListener(eventName, (event) => {
			ipcRenderer.sendToHost(eventName, event.detail);
		}, false);
	}
};
