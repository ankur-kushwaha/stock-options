import React from 'react'

import Head from 'next/head'
import { parseCookies, setCookie, destroyCookie } from 'nookies'

import Image from 'next/image'
import styles from '../styles/Home.module.css'
import KiteConnect from 'kiteconnect';
import { postData } from '../helpers';
import { getKiteClient } from '../helpers/kiteConnect';
import Header from '../components/Header';
let API_KEY = 'ab8oz67ryftv7gx9'

var kc = new KiteConnect.KiteConnect({
  api_key: API_KEY
});

export default function Home({ userProfile }) {
  console.log('userProfile',userProfile);
  return (
    <div>
      <Header userProfile={userProfile}></Header>
    </div>
  )
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
  let host = req.get( 'host');
  console.log(req.query.host , host, req.query.request_token)
  if(req.query.host && req.query.host != host){
    let request_token = req.query.request_token;
    if(req.query.host.search('localhost') >= 0){
      res.writeHead(301, { Location: `http://${req.query.host}?request_token=${request_token}`});
      return res.end()
    }
  }

  const cookies = req.cookies
  let userProfile={};
  let kt = await getKiteClient(req.cookies);
  let shouldGenerateSession = false;
  if (cookies.accessToken) {
    try {
      userProfile = await kt.getProfile()
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
      kt = await getKiteClient({
        accessToken
      });
      userProfile = await kt.getProfile()
    } else {
      //redirectKiteLogin(res);
    }
  }

  return {
    props: {
      userProfile
    }
  }

}
