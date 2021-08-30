import React from 'react'

import '../styles/mystyles.scss'
import '../styles/globals.scss'
import '@fortawesome/fontawesome-free/js/brands'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/fontawesome'
import { UserProvider } from '../context/user'

function MyApp({ Component, pageProps }) {
  return  <UserProvider>
    <Component {...pageProps} />
  </UserProvider>

}

export default MyApp
