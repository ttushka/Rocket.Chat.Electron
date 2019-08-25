import React, { createContext, useContext, useState } from 'react';


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
	const stateAndSetter = useState(null);

	return <OpenViewContext.Provider value={stateAndSetter}>
		{children}
	</OpenViewContext.Provider>;
}
