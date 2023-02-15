
import { AppProps } from 'next/app';
import Head from 'next/head';
import AppFooter from '../components/footer';
import Header from '../components/header/header';
import { AppProvider } from '../lib/AppContext';
import './styles.css';
import '../styles/globals.css'

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Stock-options</title>
      </Head>
      <AppProvider>
        <main className="app">
          <Header />
          <Component {...pageProps} />
        </main>
        <AppFooter/>
      </AppProvider>
        
    </>
  );
}

export default CustomApp;
