import React, { useEffect, useState } from 'react';
import { t } from 'i18next';
import { copyright } from '../../../package.json';
import { useAppVersion } from '../hooks/useAppVersion';
import { useAutoUpdaterState, useAutoUpdaterEvent } from './services/AutoUpdaterHandler';


let props = {
	visible: false,
	currentVersion: undefined,
	canUpdate: false,
	canAutoUpdate: false,
	canSetAutoUpdate: false,
	isCheckingForUpdates: false,
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
		isCheckingForUpdates,
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

	dialog.querySelector('.check-for-updates').toggleAttribute('disabled', isCheckingForUpdates);
	dialog.querySelector('.check-for-updates').classList.toggle('hidden', isCheckingForUpdates || updateMessage);
	dialog.querySelector('.checking-for-updates').classList.toggle('hidden', !isCheckingForUpdates && !updateMessage);

	dialog.querySelector('.checking-for-updates .message').innerText = updateMessage;
	dialog.querySelector('.checking-for-updates').classList.toggle('message-shown', !isCheckingForUpdates && updateMessage);

	if (updateMessage && !prevProps.updateMessage) {
		messageTimer = setTimeout(() => {
			setUpdateMessage('');
		}, 5000);
	}

	if (!updateMessage && prevProps.updateMessage) {
		clearTimeout(messageTimer);
	}
};

const Markup = React.memo(() =>
	<dialog className='about-modal'>
		<section className='app-info'>
			<div className='app-logo'>
				<img src='./images/logo.svg' />
			</div>
			<div className='app-version'>
				Version <span className='version'>%s</span>
			</div>
		</section>

		<section className='updates hidden'>
			<button className='check-for-updates button primary'>
				Check for Updates
			</button>

			<div className='checking-for-updates hidden'>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='message'></span>
			</div>

			<label className='check-for-updates-on-start__label'>
				<input className='check-for-updates-on-start' type='checkbox' defaultChecked /> <span>Check for Updates on Start</span>
			</label>
		</section>

		<div className='copyright'></div>
	</dialog>
);
Markup.displayName = 'Markup';

export function AboutModal(props) {
	const {
		canUpdate,
		isCheckingForUpdates,
		doesCheckForUpdatesOnStart,
		canSetCheckForUpdatesOnStart,
	} = useAutoUpdaterState();
	const appVersion = useAppVersion();
	const [updateMessage, setUpdateMessage] = useState(null);

	useAutoUpdaterEvent('update-not-available', () => {
		setUpdateMessage(t('dialog.about.noUpdatesAvailable'));
	});

	useAutoUpdaterEvent('error', () => {
		setUpdateMessage(t('dialog.about.errorWhileLookingForUpdates'));
	});

	useEffect(() => {
		setProps({
			canUpdate,
			canAutoUpdate: doesCheckForUpdatesOnStart,
			canSetAutoUpdate: canSetCheckForUpdatesOnStart,
			currentVersion: appVersion,
			isCheckingForUpdates,
			updateMessage,
			...props,
		});
	});

	return <Markup />;
}
