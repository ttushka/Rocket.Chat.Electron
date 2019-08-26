import { Button, ButtonGroup, CheckBox } from '@rocket.chat/fuselage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyright } from '../../../../package.json';
import { useAppVersion } from '../../hooks/useAppVersion.js';
import {
	useAutoUpdaterState,
	useAutoUpdaterActions,
	useAutoUpdaterEvent,
} from '../services/AutoUpdaterHandler.jsx';
import { useOpenModal, useSetOpenModal } from '../services/OpenModalState.jsx';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { Modal } from '../ui/Modal';
import { RocketChatLogo } from '../ui/RocketChatLogo';
import {
	ModalContent,
	AppInfoSection,
	AppVersionOuter,
	AppVersionInner,
	UpdateCheckIndicatorWrapper,
	UpdateCheckIndicatorMessage,
	UpdateSection,
	CopyrightWrapper,
} from './AboutModal.styles';


export function AboutModal() {
	const openModal = useOpenModal();
	const setOpenModal = useSetOpenModal();
	const isOpen = openModal === 'about';

	const {
		canUpdate,
		isCheckingForUpdates,
		doesCheckForUpdatesOnStart,
		canSetCheckForUpdatesOnStart,
	} = useAutoUpdaterState();

	const {
		checkForUpdates,
		setCheckForUpdatesOnStart,
	} = useAutoUpdaterActions();

	const [checkingMessage, setCheckingMessage] = useState(null);

	const { t } = useTranslation();

	useAutoUpdaterEvent('error', () => {
		setCheckingMessage(t('dialog.about.errorWhileLookingForUpdates'));
		setTimeout(() => {
			setCheckingMessage(null);
		}, 5000);
	});

	useAutoUpdaterEvent('update-not-available', () => {
		setCheckingMessage(t('dialog.about.noUpdatesAvailable'));
		setTimeout(() => {
			setCheckingMessage(null);
		}, 5000);
	});

	const handleClickCheckForUpdate = () => {
		checkForUpdates();
	};

	const handleChangeAutoUpdate = ({ target: { checked } }) => {
		setCheckForUpdatesOnStart(checked);
	};

	const handleClose = () => {
		setOpenModal(null);
	};

	const handleClickOk = () => {
		setOpenModal(null);
	};

	const appVersion = useAppVersion();

	return isOpen && (
		<Modal open onClose={handleClose}>
			<ModalContent>
				<AppInfoSection>
					<RocketChatLogo />

					<AppVersionOuter>
						{t('dialog.about.version')}
						&nbsp;
						<AppVersionInner>
							{appVersion}
						</AppVersionInner>
					</AppVersionOuter>
				</AppInfoSection>

				{canUpdate && (
					<UpdateSection>
						<UpdateCheckIndicatorWrapper>
							{!isCheckingForUpdates && !checkingMessage && (
								<Button primary onClick={handleClickCheckForUpdate}>
									{t('dialog.about.checkUpdates')}
								</Button>
							)}

							{isCheckingForUpdates && !checkingMessage && <LoadingIndicator />}

							{checkingMessage && (
								<UpdateCheckIndicatorMessage>
									{checkingMessage}
								</UpdateCheckIndicatorMessage>
							)}
						</UpdateCheckIndicatorWrapper>

						<CheckBox
							label={t('dialog.about.checkUpdatesOnStart')}
							checked={doesCheckForUpdatesOnStart}
							disabled={!canSetCheckForUpdatesOnStart}
							onChange={handleChangeAutoUpdate}
						/>
					</UpdateSection>
				)}

				<CopyrightWrapper>
					{t('dialog.about.copyright', { copyright })}
				</CopyrightWrapper>
			</ModalContent>

			<ButtonGroup>
				<Button primary onClick={handleClickOk}>{t('dialog.about.ok')}</Button>
			</ButtonGroup>
		</Modal>
	);
}
