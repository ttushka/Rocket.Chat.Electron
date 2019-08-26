import React, { useEffect, useRef } from 'react';
import { ModalDialog } from './Modal.styles';

export const useDialogRef = (open) => {
	const dialogRef = useRef(null);

	useEffect(() => {
		const dialog = dialogRef.current;

		open ?
			(!dialog.open && dialog.showModal()) :
			(dialog.open && dialog.close());
	}, [open]);

	return dialogRef;
};


export function Modal({ open, ...props }) {
	const dialogRef = useDialogRef(open);

	return <ModalDialog ref={dialogRef} {...props} />;
}

export {
	ModalTitle,
} from './Modal.styles';
