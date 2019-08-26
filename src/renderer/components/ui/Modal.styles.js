import styled from 'styled-components';


export const ModalDialog = styled.dialog`
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	display: none;
	flex-flow: column nowrap;
	padding: 1rem;
	cursor: default;
	user-select: none;
	color: var(--color-dark-70);
	border: 1px solid var(--color-dark-70);
	background-color: var(--color-dark-05);

 	&::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

 	&[open] {
		display: flex;
	}
`;

export const ModalTitle = styled.h2`
	margin: 0 0 1rem;
	font-size: 1.5rem;
	line-height: normal;
`;
