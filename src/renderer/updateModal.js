import { t } from 'i18next';


let props = {
	visible: false,
	currentVersion: 'a.b.c',
	newVersion: 'x.y.z',
};
let dialog;

const handleBackdropClick = (event) => {
	const { clientLeft, clientTop, clientWidth, clientHeight } = dialog;
	const { left, top } = dialog.getBoundingClientRect();
	const { clientX, clientY } = event;

	const minX = left + clientLeft;
	const minY = top + clientTop;
	if ((clientX < minX || clientX >= minX + clientWidth) || (clientY < minY || clientY >= minY + clientHeight)) {
		const { onDismiss } = props;
		onDismiss && onDismiss();
	}
};

const handleSkipUpdateClick = async (event) => {
	event.preventDefault();
	const { newVersion, onSkipUpdateVersion } = props;
	onSkipUpdateVersion && onSkipUpdateVersion(newVersion);
};

const handleRemindUpdateLaterClick = (event) => {
	event.preventDefault();
	const { newVersion, onRemindUpdateLater } = props;
	onRemindUpdateLater && onRemindUpdateLater(newVersion);
};

const handleInstallUpdateClick = async (event) => {
	event.preventDefault();
	const { newVersion, onInstallUpdate } = props;
	onInstallUpdate && onInstallUpdate(newVersion);
};

const setProps = (partialProps) => {
	props = {
		...props,
		...partialProps,
	};

	if (!dialog) {
		dialog = document.querySelector('.update-modal');

		dialog.addEventListener('click', handleBackdropClick, false);
		dialog.querySelector('.update-skip-action').addEventListener('click', handleSkipUpdateClick, false);
		dialog.querySelector('.update-remind-action').addEventListener('click', handleRemindUpdateLaterClick, false);
		dialog.querySelector('.update-install-action').addEventListener('click', handleInstallUpdateClick, false);
	}

	const {
		visible,
		currentVersion,
		newVersion,
	} = props;

	if (visible && !dialog.open) {
		dialog.showModal();
		dialog.querySelector('.update-install-action').focus();
	}

	if (!visible && dialog.open) {
		dialog.close();
	}

	dialog.querySelector('.update-title').innerText = t('dialog.update.announcement');
	dialog.querySelector('.update-message').innerText = t('dialog.update.message');
	dialog.querySelector('.current-version .app-version-label').innerText = t('dialog.update.currentVersion');
	dialog.querySelector('.new-version .app-version-label').innerText = t('dialog.update.newVersion');
	dialog.querySelector('.update-skip-action').innerText = t('dialog.update.skip');
	dialog.querySelector('.update-remind-action').innerText = t('dialog.update.remindLater');
	dialog.querySelector('.update-install-action').innerText = t('dialog.update.install');

	dialog.querySelector('.current-version .app-version-value').innerText = currentVersion;
	dialog.querySelector('.new-version .app-version-value').innerText = newVersion;
};

export default {
	setProps,
};
