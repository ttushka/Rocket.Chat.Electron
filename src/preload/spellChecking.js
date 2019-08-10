import { webFrame, ipcRenderer } from 'electron';


export default () => {
	const callbacks = new Map();

	ipcRenderer.on('spell-checker/check/result', (event, id, mispeltWords) => {
		callbacks.get(id).call(null, mispeltWords);
		callbacks.delete(id);
	});

	webFrame.setSpellCheckProvider('', {
		spellCheck: (words, callback) => {
			const id = Math.random().toString(36).slice(2);
			callbacks.set(id, callback);
			ipcRenderer.sendToHost('spell-checker/check', id, words);
		},
	});
};
