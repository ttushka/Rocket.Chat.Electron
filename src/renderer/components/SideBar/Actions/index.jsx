import React from 'react';
import { useTranslation } from 'react-i18next';
import {
	Container,
	StyledPlusIcon,
} from './styles';
import { Action } from './Action';
import { useSetOpenView } from '../../services/OpenViewState';
import { useServersActions } from '../../services/ServersProvider';


export function Actions() {
	const setOpenView = useSetOpenView();
	const { setActiveServerURL } = useServersActions();

	const handleShowLanding = () => {
		setOpenView('landing');
		setActiveServerURL(null);
	};

	const { t } = useTranslation();

	return (
		<Container>
			<Action
				icon={<StyledPlusIcon />}
				label={t('sidebar.addNewServer')}
				onClick={handleShowLanding}
			/>
		</Container>
	);
}
