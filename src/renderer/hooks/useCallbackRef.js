import { useRef } from 'react';


export const useCallbackRef = (callback) => {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	return (...args) => callbackRef.current.call(null, ...args);
};
