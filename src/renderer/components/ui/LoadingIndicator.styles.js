import styled, { css, keyframes } from 'styled-components';


export const Container = styled.div`
	display: flex;
	color: var(--color-dark-30, white);
	align-items: center;
	justify-content: center;
`;

export const Dot = styled.span`
	width: 0.75rem;
	height: 0.75rem;
	margin: 0.15rem;
	${ ({ order }) => css`
		animation: ${ keyframes`
			0%,
			80%,
			100% {
				transform: scale(0);
			}
			40% {
				transform: scale(1);
			}
		` } 1400ms infinite ease-in-out ${ -160 * order }ms both;
	` }
	border-radius: 100%;
	background-color: currentColor;
`;
