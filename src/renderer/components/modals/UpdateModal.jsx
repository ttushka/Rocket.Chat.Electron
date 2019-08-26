import { Button, ButtonGroup } from '@rocket.chat/fuselage';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalTitle } from '../ui/Modal';
import { AppVersion } from '../ui/AppVersion';
import {
	ModalContent,
	Message,
	UpdateInfoSection,
	UpdateInfoArrow,
} from './UpdateModal.styles';
import { useOpenModal, useSetOpenModal } from '../services/OpenModalState';
import { showMessageBox } from '../../dialogs';
import { useAutoUpdaterState, useAutoUpdaterActions } from '../services/AutoUpdaterHandler';
import { useAppVersion } from '../../hooks/useAppVersion';


export function UpdateModal() {
	const openModal = useOpenModal();
	const setOpenModal = useSetOpenModal();

	const isOpen = openModal === 'update';

	const currentVersion = useAppVersion();

	const {
		newVersion,
	} = useAutoUpdaterState();

	const {
		downloadUpdate,
		setSkippedVersion,
	} = useAutoUpdaterActions();

	const { t } = useTranslation();

	const warnItWillSkipVersion = async () => {
		await showMessageBox({
			title: t('dialog.updateSkip.title'),
			message: t('dialog.updateSkip.message'),
			type: 'warning',
			buttons: [t('dialog.updateSkip.ok')],
			defaultId: 0,
		});
	};

	const informItWillDownloadUpdate = async () => {
		await showMessageBox({
			title: t('dialog.updateDownloading.title'),
			message: t('dialog.updateDownloading.message'),
			type: 'info',
			buttons: [t('dialog.updateDownloading.ok')],
			defaultId: 0,
		});
	};

	const handleClickRemindLater = () => {
		setOpenModal(null);
	};

	const handleClickSkip = async () => {
		await warnItWillSkipVersion();
		setSkippedVersion(newVersion);
		setOpenModal(null);
	};

	const handleClickInstall = async () => {
		await informItWillDownloadUpdate();
		await downloadUpdate();
		setOpenModal(null);
	};

	const handleClose = () => {
		setOpenModal(null);
	};

	return isOpen && (
		<Modal open onClose={handleClose}>
			<ModalContent>
				<ModalTitle>{t('dialog.update.announcement')}</ModalTitle>

				<Message>{t('dialog.update.message')}</Message>

				<UpdateInfoSection>
					<AppVersion
						label={t('dialog.update.currentVersion')}
						version={currentVersion}
						current
					/>

					<UpdateInfoArrow>
						→
					</UpdateInfoArrow>

					<AppVersion
						label={t('dialog.update.newVersion')}
						version={newVersion}
					/>
				</UpdateInfoSection>
			</ModalContent>

			<ButtonGroup>
				<Button onClick={handleClickSkip}>{t('dialog.update.skip')}</Button>
				<Button onClick={handleClickRemindLater}>{t('dialog.update.remindLater')}</Button>
				<Button primary onClick={handleClickInstall}>{t('dialog.update.install')}</Button>
			</ButtonGroup>
		</Modal>
	);
}
