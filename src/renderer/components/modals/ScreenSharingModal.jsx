import { desktopCapturer } from 'electron';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusedWebContents } from '../services/FocusedWebContentsHolder';
import { useOpenModal, useSetOpenModal } from '../services/OpenModalState';
import { Modal, ModalTitle } from '../ui/Modal';
import {
	ModalContent,
	ScreenSharingSources,
	ScreenSharingSource,
	ScreenSharingSourceThumbnail,
	ScreenSharingSourceName,
} from './ScreenSharingModal.styles';


export function ScreenSharingModal() {
	const openModal = useOpenModal();
	const setOpenModal = useSetOpenModal();
	const focusedWebContents = useFocusedWebContents();
	const isOpen = openModal === 'screenSharing';

	const [sources, setSources] = useState([]);

	useEffect(() => {
		if (isOpen && sources.length === 0) {
			desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
				if (error) {
					throw error;
				}

				setSources(sources);
			});
		}

		if (!isOpen && sources.length > 0) {
			setSources([]);
		}
	}, [isOpen]);

	const { t } = useTranslation();

	const handleScreenSharingSourceClick = (id) => {
		setOpenModal(null);
		focusedWebContents.send('screenshare-result', id);
	};

	const handleClose = () => {
		setOpenModal(null);
		focusedWebContents.send('screenshare-result', 'PermissionDeniedError');
	};

	return !!(isOpen && sources.length > 0) && (
		<Modal open onClose={handleClose}>
			<ModalContent>
				<ModalTitle>{t('dialog.screenshare.announcement')}</ModalTitle>
				<ScreenSharingSources>
					{sources.map(({ id, name, thumbnail }) => (
						<ScreenSharingSource
							key={id}
							onClick={handleScreenSharingSourceClick.bind(null, id)}
						>
							<ScreenSharingSourceThumbnail
								src={thumbnail.toDataURL()}
								alt={name}
							/>
							<ScreenSharingSourceName>
								{name}
							</ScreenSharingSourceName>
						</ScreenSharingSource>
					))}
				</ScreenSharingSources>
			</ModalContent>
		</Modal>
	);
}
