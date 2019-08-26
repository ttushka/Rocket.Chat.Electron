import styled from 'styled-components';
import { Tooltip } from '../../styles';


export const Button = styled.button`
	position: relative;
	width: 40px;
	height: 40px;
	margin: 4px;
	padding: 0;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	background-color: rgba(0, 0, 0, .1);
	color: inherit;
	cursor: pointer;
	outline: none;
	transition:
		background-color var(--transitions-duration),
		color var(--transitions-duration),
		transform var(--transitions-duration);

	&:hover {
		background-color: rgba(255, 255, 255, .05);
	}

	&:hover ${ Tooltip } {
		visibility: visible;
		opacity: 1;
	}

	&:active {
		transform: scale(0.9);
	}
`;
