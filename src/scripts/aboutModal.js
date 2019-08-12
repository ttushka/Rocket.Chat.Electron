import { t } from 'i18next';
import { copyright } from '../../package.json';


let props = {
	canUpdate: false,
	canAutoUpdate: false,
	canSetAutoUpdate: false,
	isCheckingForUpdate: false,
	updateMessage: '',
};
let dialog;
let messageTimer;

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

const handleCheckForUpdatesClick = (event) => {
	event.preventDefault();
	const { onClickCheckForUpdates } = props;
	onClickCheckForUpdates && onClickCheckForUpdates(event.target.checked);
};

const handleCheckForUpdatesOnStartChange = (event) => {
	const { onToggleCheckForUpdatesOnStart } = props;
	onToggleCheckForUpdatesOnStart && onToggleCheckForUpdatesOnStart(event.target.checked);
};

const setProps = (partialProps) => {
	const prevProps = props;
	props = {
		...props,
		...partialProps,
	};

	const setUpdateMessage = (updateMessage) => setProps({ updateMessage });

	if (!dialog) {
		dialog = document.querySelector('.about-modal');

		dialog.addEventListener('click', handleBackdropClick, false);
		dialog.querySelector('.check-for-updates-on-start').addEventListener('change', handleCheckForUpdatesOnStartChange, false);
		dialog.querySelector('.check-for-updates').addEventListener('click', handleCheckForUpdatesClick, false);
	}

	const {
		visible,
		currentVersion,
		canUpdate,
		canAutoUpdate,
		canSetAutoUpdate,
		isCheckingForUpdate,
		updateMessage,
	} = props;

	if (visible && !dialog.open) {
		dialog.showModal();
	}

	if (!visible && dialog.open) {
		dialog.close();
	}

	dialog.querySelector('.app-version').innerHTML = `${ t('dialog.about.version') } <span class="version">${ currentVersion }</span>`;
	dialog.querySelector('.check-for-updates').innertText = t('dialog.about.checkUpdates');
	dialog.querySelector('.check-for-updates-on-start + span').innertText = t('dialog.about.checkUpdatesOnStart');
	dialog.querySelector('.copyright').innertText = t('dialog.about.copyright', { copyright });

	dialog.querySelector('.updates').classList.toggle('hidden', !canUpdate);
	dialog.querySelector('.check-for-updates-on-start').toggleAttribute('checked', canAutoUpdate);
	dialog.querySelector('.check-for-updates-on-start').toggleAttribute('disabled', !canSetAutoUpdate);

	dialog.querySelector('.check-for-updates').toggleAttribute('disabled', isCheckingForUpdate);
	dialog.querySelector('.check-for-updates').classList.toggle('hidden', isCheckingForUpdate || updateMessage);
	dialog.querySelector('.checking-for-updates').classList.toggle('hidden', !isCheckingForUpdate && !updateMessage);

	dialog.querySelector('.checking-for-updates .message').innerText = updateMessage;
	dialog.querySelector('.checking-for-updates').classList.toggle('message-shown', !isCheckingForUpdate && updateMessage);

	if (updateMessage && !prevProps.updateMessage) {
		messageTimer = setTimeout(() => {
			setUpdateMessage('');
		}, 5000);
	}

	if (!updateMessage && prevProps.updateMessage) {
		clearTimeout(messageTimer);
	}
};

export default {
	setProps,
};
