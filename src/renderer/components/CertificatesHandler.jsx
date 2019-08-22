import { remote } from 'electron';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { parse as parseURL } from 'url';
import { reportError } from '../../errorHandling';
import { readUserDataFile, writeUserDataFile } from '../userData';
import { useEventListener } from '../hooks/useEventListener';


const { app } = remote;

const certificatesFileName = 'certificate.json';

const loadCertificates = async () => {
	let certificates;

	try {
		certificates = await readUserDataFile(certificatesFileName, 'json');
	} catch (error) {
		reportError(error);
	}

	if (certificates === null || typeof certificates !== 'object') {
		certificates = {};
	}

	return certificates;
};

const persistCertificates = async (certificates) => {
	try {
		await writeUserDataFile(certificatesFileName, certificates);
	} catch (error) {
		reportError(error);
	}
};

const CertificateTrustRequestHandlerContext = createContext({});
const ClearCertificatesContext = createContext(() => {});

export const useCertificateTrustRequestHandler = (handler) => {
	const handlerRef = useContext(CertificateTrustRequestHandlerContext);
	handlerRef.current = handler;
};

export const useClearCertificates = () => useContext(ClearCertificatesContext);

const useCertificateErrorEvent = (certificates, setCertificates, handlerRef) => {
	const serializeCertificate = ({ issuerName, data }) => `${ issuerName }\n${ data.toString() }`;

	const addTrustedCertificate = (certificateUrl, certificate) => {
		const { host } = parseURL(certificateUrl);
		setCertificates({
			...certificates,
			[host]: serializeCertificate(certificate),
		});
	};

	const hasTrustedCertificateFor = (certificateUrl) => {
		const { host } = parseURL(certificateUrl);
		return certificates.hasOwnProperty(host);
	};

	const isCertificateTrusted = (certificateUrl, certificate) => {
		const { host } = parseURL(certificateUrl);
		if (!hasTrustedCertificateFor(certificateUrl)) {
			return false;
		}

		return certificates[host] === serializeCertificate(certificate);
	};

	const certificateTrustRequestsRef = useRef();
	if (!certificateTrustRequestsRef.current) {
		certificateTrustRequestsRef.current = {};
	}

	const handleAppCertificateError = async (event, webContents, certificateUrl, error, certificate, callback) => {
		if (isCertificateTrusted(certificateUrl, certificate)) {
			callback(true);
			return;
		}

		const { fingerprint } = certificate;

		const { current: certificateTrustRequests } = certificateTrustRequestsRef;

		if (certificateTrustRequests[fingerprint]) {
			certificateTrustRequests[fingerprint].push(callback);
			return;
		}

		certificateTrustRequests[fingerprint] = [callback];
		const isReplacing = hasTrustedCertificateFor(certificateUrl);

		const isTrusted = handlerRef.current
			? await handlerRef.current.call(null, webContents, certificateUrl, error, certificate, isReplacing)
			: false;

		if (isTrusted) {
			addTrustedCertificate(certificateUrl, certificate);
		}

		for (const callback of certificateTrustRequests[fingerprint] || []) {
			callback(isTrusted);
		}
		delete certificateTrustRequests[fingerprint];
	};

	useEventListener(app, 'certificate-error', handleAppCertificateError);
};

const useCertificatesPersistence = (certificates) => {
	useEffect(() => {
		persistCertificates(certificates);
	}, [certificates]);
};

export const CertificatesHandler = React.lazy(async () => {
	const loadedCertificates = await loadCertificates();

	function CertificatesHandler({ children }) {
		const [certificates, setCertificates] = useState(loadedCertificates);
		const handlerRef = useRef(() => false);

		useCertificateErrorEvent(certificates, setCertificates, handlerRef);
		useCertificatesPersistence(certificates);

		const clearCertificates = useCallback(() => {
			setCertificates({});
		}, []);

		return <CertificateTrustRequestHandlerContext.Provider value={handlerRef}>
			<ClearCertificatesContext.Provider value={clearCertificates}>
				{children}
			</ClearCertificatesContext.Provider>
		</CertificateTrustRequestHandlerContext.Provider>;
	}

	return { default: CertificatesHandler };
});
