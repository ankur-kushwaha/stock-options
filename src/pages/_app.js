import React from 'react'
import Head from 'next/head'

import '../styles/mystyles.scss'
import '../styles/globals.scss'
import '@fortawesome/fontawesome-free/js/brands'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/fontawesome'
import { UserProvider } from '../context/user'
import { ToastProvider } from 'react-toast-notifications';

function MyApp({ Component, pageProps }) {
  return  <UserProvider>
    <ToastProvider
      autoDismiss
      autoDismissTimeout={6000}
      // components={{ Toast: Snack }}
      placement="bottom-center"
    >
      <Head>
        <title>Smart Options</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.3/css/bulma.min.css" />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  </UserProvider>

}

export default MyApp
