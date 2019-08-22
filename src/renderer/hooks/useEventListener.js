import { useEffect, useRef } from 'react';


export const useEventListener = (eventEmitter, eventName, listener) => {
	const listenerRef = useRef(listener);
	listenerRef.current = listener;

	useEffect(() => {
		const attachedListener = (...args) => listenerRef.current.call(null, ...args);

		eventEmitter.addListener(eventName, attachedListener);

		return () => {
			eventEmitter.removeListener(eventName, attachedListener);
		};
	}, [eventEmitter, eventName]);
};
