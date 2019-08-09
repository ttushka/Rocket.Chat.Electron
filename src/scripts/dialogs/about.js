import { remote, ipcRenderer } from 'electron';
import i18n from '../../i18n';
import { copyright } from '../../../package.json';


let dialog;

const mount = () => {
	dialog = document.querySelector('.about-page');

	const appVersion = remote.app.getVersion();

	dialog.querySelector('.app-version').innerHTML = `${ i18n.__('dialog.about.version') } <span class="version">${ appVersion }</span>`;
	dialog.querySelector('.check-for-updates').innerHTML = i18n.__('dialog.about.checkUpdates');
	dialog.querySelector('.check-for-updates-on-start + span').innerHTML = i18n.__('dialog.about.checkUpdatesOnStart');
	dialog.querySelector('.copyright').innerHTML = i18n.__('dialog.about.copyright', { copyright });

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

	const canUpdate = ipcRenderer.sendSync('can-update');

	if (canUpdate) {
		const canAutoUpdate = ipcRenderer.sendSync('can-auto-update');

		if (canAutoUpdate) {
			dialog.querySelector('.check-for-updates-on-start').setAttribute('checked', 'checked');
		} else {
			dialog.querySelector('.check-for-updates-on-start').removeAttribute('checked');
		}

		const canSetAutoUpdate = ipcRenderer.sendSync('can-set-auto-update');
		if (canSetAutoUpdate) {
			dialog.querySelector('.check-for-updates-on-start').addEventListener('change', (event) => {
				ipcRenderer.send('set-auto-update', event.target.checked);
			});
		} else {
			dialog.querySelector('.check-for-updates-on-start').setAttribute('disabled', 'disabled');
		}

		dialog.querySelector('.check-for-updates').addEventListener('click', (e) => {
			e.preventDefault();
			dialog.querySelector('.check-for-updates').setAttribute('disabled', 'disabled');
			dialog.querySelector('.check-for-updates').classList.add('hidden');
			dialog.querySelector('.checking-for-updates').classList.remove('hidden');
			ipcRenderer.send('check-for-updates', { forced: true });
		}, false);

		const resetUpdatesSection = () => {
			dialog.querySelector('.check-for-updates').removeAttribute('disabled');
			dialog.querySelector('.check-for-updates').classList.remove('hidden');
			dialog.querySelector('.checking-for-updates').classList.add('hidden');
		};

		ipcRenderer.on('update-result', (e, updateAvailable) => {
			if (updateAvailable) {
				resetUpdatesSection();
				dialog.close();
				return;
			}

			dialog.querySelector('.checking-for-updates .message').innerHTML = i18n.__('dialog.about.noUpdatesAvailable');
			dialog.querySelector('.checking-for-updates').classList.add('message-shown');

			setTimeout(() => {
				resetUpdatesSection();
				dialog.querySelector('.checking-for-updates .message').innerHTML = '';
				dialog.querySelector('.checking-for-updates').classList.remove('message-shown');
			}, 5000);
		});

		ipcRenderer.on('update-error', () => {
			dialog.querySelector('.checking-for-updates .message').innerHTML = i18n.__('dialog.about.errorWhileLookingForUpdates');
			dialog.querySelector('.checking-for-updates').classList.add('message-shown');

			setTimeout(() => {
				resetUpdatesSection();
				dialog.querySelector('.checking-for-updates .message').innerHTML = '';
				dialog.querySelector('.checking-for-updates').classList.remove('message-shown');
			}, 5000);
		});

		dialog.querySelector('.updates').classList.remove('hidden');
	}
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

	dialog.close();
};

export default {
	open,
	close,
};
