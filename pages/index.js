import Head from 'next/head'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

import Image from 'next/image'
import styles from '../styles/Home.module.css'
import KiteConnect from 'kiteconnect';
import { postData } from '../helpers';
import { getKiteClient } from '../helpers/kiteConnect';

let API_KEY = 'ab8oz67ryftv7gx9'

var kc = new KiteConnect.KiteConnect({
  api_key: API_KEY
});

export default function Home({ token }) {
  3

  return (
    <div className={styles.container}>
      Homepage

    </div>
  )
}

function redirectKiteLogin(res) {
  res.writeHead(301, { Location: "https://kite.zerodha.com/connect/login?v=3&api_key=" + API_KEY })
  res.end()
}

async function generateAccessToken(requestToken) {
  console.log("Generating session from requesttoken", requestToken)
  try {
    let response = await kc.generateSession(requestToken, "60960qn0cpdca5m4o5lymxpj05xz0hcl");

    console.log(response);

    if (response.access_token) {
      return response.access_token;
    } else {
      console.log('failed', response)
      res.status(200).json({ status: 'failed', response })
    }
  } catch (e) {
    console.log(e)
    throw new Error("Failed to generate accessToken");
  }


}

export async function getServerSideProps(ctx) {
  let { req, res, query } = ctx;

  const cookies = parseCookies(ctx);

  let shouldGenerateSession = false;
  if (cookies.accessToken) {
    try {
      let kt = await getKiteClient(req.cookies);
      let res = await kt.getQuote(["NSE:INFY"])
      res.status(200).json({ status: 'success', res })
    } catch (e) {
      shouldGenerateSession = true;
    }
  } else {
    shouldGenerateSession = true;
  }

  if (shouldGenerateSession) {
    if (query.request_token) {
      let accessToken = await generateAccessToken(query.request_token);
      setCookie(ctx, 'accessToken', accessToken, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      res.status(200).json({ status: 'success', accessToken })
    } else {
      redirectKiteLogin(res);
    }
  }

  return {
    props: {
      token: ""
    }
  }

}
