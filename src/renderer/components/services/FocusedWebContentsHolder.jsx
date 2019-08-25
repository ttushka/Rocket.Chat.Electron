import { remote } from 'electron';
import React, { createContext, useContext, useState } from 'react';


const { getCurrentWebContents } = remote;

const mainWindowWebContents = getCurrentWebContents();

const FocusedWebContentsContext = createContext(mainWindowWebContents);

export const useFocusedWebContents = () => {
	const [webContents] = useContext(FocusedWebContentsContext);
	return webContents;
};

export const useSetFocusedWebContents = () => {
	const [, setWebContents] = useContext(FocusedWebContentsContext);
	return setWebContents;
};

export function FocusedWebContentsHolder({ children }) {
	const stateAndSetter = useState(mainWindowWebContents);

	return <FocusedWebContentsContext.Provider value={stateAndSetter}>
		{children}
	</FocusedWebContentsContext.Provider>;
}
