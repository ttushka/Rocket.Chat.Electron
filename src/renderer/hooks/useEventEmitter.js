import { EventEmitter } from 'events';
import { useRef } from 'react';


export const useEventEmitter = () => {
	const eventEmitterRef = useRef();

	if (!eventEmitterRef.current) {
		eventEmitterRef.current = new EventEmitter();
	}

	return eventEmitterRef.current;
};
