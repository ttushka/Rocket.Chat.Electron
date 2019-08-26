import React from 'react';
import { LoadingSplash } from './LoadingSplash';
import { PreferencesProvider } from './services/PreferencesProvider';
import { ServersProvider } from './services/ServersProvider';
import { BasicAuthenticationHandler } from './services/BasicAuthenticationHandler';
import { AutoUpdaterHandler } from './services/AutoUpdaterHandler';
import { CertificatesHandler } from './services/CertificatesHandler';
import { Dock } from './Dock';
import { MainWindow } from './MainWindow';
import { MenuBar } from './MenuBar';
import { TouchBar } from './TouchBar';
import { TrayIcon } from './TrayIcon';
import { DeepLinkingHandler } from './services/DeepLinkingHandler';
import { FocusedWebContentsHolder } from './services/FocusedWebContentsHolder';
import { OpenModalState } from './services/OpenModalState';
import { OpenViewState } from './services/OpenViewState';
import { Shell } from './Shell';


export function App() {
	return (
		<React.Suspense fallback={<LoadingSplash />}>
			<PreferencesProvider>
				<ServersProvider>
					<MainWindow>
						<AutoUpdaterHandler>
							<CertificatesHandler>
								<DeepLinkingHandler>
									<BasicAuthenticationHandler />
									<FocusedWebContentsHolder>
										<OpenModalState>
											<OpenViewState>
												<MenuBar />
												<Shell />
												<Dock />
												<TrayIcon />
												<TouchBar />
											</OpenViewState>
										</OpenModalState>
									</FocusedWebContentsHolder>
								</DeepLinkingHandler>
							</CertificatesHandler>
						</AutoUpdaterHandler>
					</MainWindow>
				</ServersProvider>
			</PreferencesProvider>
		</React.Suspense>
	);
}
