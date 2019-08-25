import React, { createContext, useContext, useState } from 'react';


const OpenModalContext = createContext([]);

export const useOpenModal = () => {
	const [openModal] = useContext(OpenModalContext);
	return openModal;
};

export const useSetOpenModal = () => {
	const [, setOpenModal] = useContext(OpenModalContext);
	return setOpenModal;
};

export function OpenModalState({ children }) {
	const stateAndSetter = useState(null);

	return <OpenModalContext.Provider value={stateAndSetter}>
		{children}
	</OpenModalContext.Provider>;
}
