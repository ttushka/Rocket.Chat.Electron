import { remote, ipcRenderer } from 'electron';
import i18n from '../../i18n';


let dialog;

const mount = () => {
	dialog = document.querySelector('.update-page');

	dialog.querySelector('.update-title').innerHTML = i18n.__('dialog.update.announcement');
	dialog.querySelector('.update-message').innerHTML = i18n.__('dialog.update.message');
	dialog.querySelector('.current-version .app-version-label').innerHTML = i18n.__('dialog.update.currentVersion');
	dialog.querySelector('.new-version .app-version-label').innerHTML = i18n.__('dialog.update.newVersion');
	dialog.querySelector('.update-skip-action').innerHTML = i18n.__('dialog.update.skip');
	dialog.querySelector('.update-remind-action').innerHTML = i18n.__('dialog.update.remindLater');
	dialog.querySelector('.update-install-action').innerHTML = i18n.__('dialog.update.install');

	dialog.addEventListener('click', (event) => {
		const { clientLeft, clientTop, clientWidth, clientHeight } = dialog;
		const { left, top } = dialog.getBoundingClientRect();
		const { clientX, clientY } = event;

		const minX = left + clientLeft;
		const minY = top + clientTop;
		if ((clientX < minX || clientX >= minX + clientWidth) || (clientY < minY || clientY >= minY + clientHeight)) {
			dialog.close();
		}
	}, false);

	dialog.querySelector('.update-skip-action').addEventListener('click', (event) => {
		event.preventDefault();
		dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'warning',
			title: i18n.__('dialog.updateSkip.title'),
			message: i18n.__('dialog.updateSkip.message'),
			buttons: [i18n.__('dialog.updateSkip.ok')],
			defaultId: 0,
		}, () => {
			ipcRenderer.send('skip-update-version', dialog.querySelector('.new-version .app-version-value').innerText);
			dialog.close();
		});
	}, false);

	dialog.querySelector('.update-remind-action').addEventListener('click', (event) => {
		event.preventDefault();
		ipcRenderer.send('remind-update-later');
		dialog.close();
	}, false);

	dialog.querySelector('.update-install-action').addEventListener('click', (event) => {
		event.preventDefault();
		dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: i18n.__('dialog.updateDownloading.title'),
			message: i18n.__('dialog.updateDownloading.message'),
			buttons: [i18n.__('dialog.updateDownloading.ok')],
			defaultId: 0,
		}, () => {
			ipcRenderer.send('download-update');
			dialog.close();
		});
	}, false);
};

const open = ({ newVersion } = {}) => {
	if (!dialog) {
		mount();
	}

	if (dialog.open) {
		return;
	}

	dialog.querySelector('.current-version .app-version-value').innerText = remote.app.getVersion();
	dialog.querySelector('.new-version .app-version-value').innerText = newVersion;

	dialog.querySelector('.update-install-action').focus();

	dialog.showModal();
};

const close = () => {
	if (!dialog) {
		mount();
	}

	if (!dialog.open) {
		return;
	}

	dialog.close();
};

export default {
	open,
	close,
};
