import { desktopCapturer, ipcRenderer } from 'electron';
import i18n from '../../i18n';

let dialog;

const mount = () => {
	dialog = document.querySelector('.screenshare-page');

	dialog.querySelector('.screenshare-title').innerText = i18n.__('dialog.screenshare.announcement');

	dialog.addEventListener('click', (event) => {
		const { clientLeft, clientTop, clientWidth, clientHeight } = dialog;
		const { left, top } = dialog.getBoundingClientRect();
		const { clientX, clientY } = event;

		const minX = left + clientLeft;
		const minY = top + clientTop;
		if ((clientX < minX || clientX >= minX + clientWidth) || (clientY < minY || clientY >= minY + clientHeight)) {
			ipcRenderer.emit('screenshare-result', null, 'PermissionDeniedError');
			dialog.close();
		}
	}, false);

	const template = dialog.querySelector('.screenshare-source-template');

	desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
		if (error) {
			throw error;
		}

		document.querySelector('.screenshare-sources').innerHTML = '';

		sources.forEach(({ id, name, thumbnail }) => {
			const sourceView = document.importNode(template.content, true);

			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('alt', name);
			sourceView.querySelector('.screenshare-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());
			sourceView.querySelector('.screenshare-source-name').textContent = name;

			sourceView.querySelector('.screenshare-source').addEventListener('click', () => {
				ipcRenderer.emit('select-screenshare-source', null, id);

				dialog.close();
			}, false);

			document.querySelector('.screenshare-sources').appendChild(sourceView);
		});
	});
};

const open = () => {
	if (!dialog) {
		mount();
	}

	if (dialog.open) {
		return;
	}

	dialog.showModal();
};

const close = () => {
	if (!dialog) {
		mount();
	}

	if (!dialog.open) {
		return;
	}

	ipcRenderer.emit('screenshare-result', null, 'PermissionDeniedError');
	dialog.close();
};

const selectSource = (id) => {
	ipcRenderer.emit('screenshare-result', null, id);
	dialog.close();
};

ipcRenderer.on('select-screenshare-source', (e, ...args) => selectSource(...args));

export default {
	open,
	close,
	selectSource,
};
