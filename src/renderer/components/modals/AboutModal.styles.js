import styled from 'styled-components';


export const ModalContent = styled.div`
	max-width: 400px;
	margin: 1rem;
`;

export const AppInfoSection = styled.section`
	display: flex;
	flex-direction: column;
	flex: 1;
	justify-content: center;
	margin: 2rem 0;
`;

export const AppVersionOuter = styled.div`
	font-size: 0.75rem;
	text-align: center;
`;

export const AppVersionInner = styled.span`
	cursor: text;
	user-select: all;
	font-weight: bold;
`;

export const UpdateSection = styled.section`
	display: flex;
	flex-flow: column nowrap;
	flex: 1;
	justify-content: center;
	align-items: center;
	margin: 1rem 0;
`;

export const UpdateCheckIndicatorWrapper = styled.div`
	display: flex;
	flex-flow: row nowrap;
	align-items: center;
	height: 2.5rem;
	margin: 1rem 0;
`;

export const UpdateCheckIndicatorMessage = styled.div`
	color: var(--color-dark-30);
	text-align: center;
`;

export const CopyrightWrapper = styled.div`
	margin: 0 auto;
	font-size: 0.75rem;
	text-align: center;
`;
