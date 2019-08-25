import { remote } from 'electron';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';


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

	const handleWindowFocusRef = useRef();
	handleWindowFocusRef.current = () => {
		const [focusedWebContents] = stateAndSetter;
		focusedWebContents.focus();
	};

	useEffect(() => {
		const handleWindowFocus = () => handleWindowFocusRef.current.call();

		window.addEventListener('focus', handleWindowFocus);

		return () => {
			window.removeEventListener('focus', handleWindowFocus);
		};
	}, []);

	return <FocusedWebContentsContext.Provider value={stateAndSetter}>
		{children}
	</FocusedWebContentsContext.Provider>;
}
