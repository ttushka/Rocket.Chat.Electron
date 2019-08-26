import React, { useMemo } from 'react';
import { Actions } from './Actions';
import { ServerList } from './ServerList';
import { Container } from './styles';
import { usePreferences } from '../services/PreferencesProvider';
import { useActiveServer } from '../services/ServersProvider';


export function SideBar() {
	const { isSideBarVisible } = usePreferences();
	const activeServer = useActiveServer();
	const { background, color } = useMemo(() => (activeServer ? activeServer.style : {}), [activeServer]);

	return (
		<Container
			visible={isSideBarVisible}
			background={background}
			color={color}
		>
			<ServerList />
			<Actions />
		</Container>
	);
}
