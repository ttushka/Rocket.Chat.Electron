import React, { createContext, useContext, useState } from 'react';
import { useActiveServer } from './ServersProvider';


const OpenViewContext = createContext([]);

export const useOpenView = () => {
	const [openView] = useContext(OpenViewContext);
	return openView;
};

export const useSetOpenView = () => {
	const [, setOpenView] = useContext(OpenViewContext);
	return setOpenView;
};

export function OpenViewState({ children }) {
	const activeServer = useActiveServer();
	const stateAndSetter = useState(activeServer ? 'webViews' : 'landing');

	return <OpenViewContext.Provider value={stateAndSetter}>
		{children}
	</OpenViewContext.Provider>;
}
