import { useEffect } from 'react';
import { useCallbackRef } from './useCallbackRef';


export const useEventListener = (eventEmitter, eventName, listener) => {
	const listenerRef = useCallbackRef(listener);

	useEffect(() => {
		if (!eventEmitter) {
			return;
		}

		eventEmitter.addListener(eventName, listenerRef);

		return () => {
			eventEmitter.removeListener(eventName, listenerRef);
		};
	}, [eventEmitter, eventName]);
};
