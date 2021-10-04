import React from 'react'

import {  setCookie } from 'nookies'
import {createUser, getUser,updateUser} from '../helpers/dbHelper'

import KiteConnect from 'kiteconnect';

import { getKiteClient } from '../helpers/kiteConnect';
import Header from '../components/Header';
import { validateUser } from '../helpers/userHelper';
import connectDB from '../middleware/mongodb';
import dbConnect from '../middleware/mongodb';
let API_KEY = 'ab8oz67ryftv7gx9'

var kc = new KiteConnect.KiteConnect({
  api_key: API_KEY
});

export default function Home({ user }) {
  console.log(user)
  return (
    <div>
      
      <Header userProfile={user}></Header>


      {!user.user_id && (
        <div className="mt-6 container">

          <article className="message is-info">
            <div className="message-body">
            Please login to get started
            </div></article>
        </div>
      )} 

      {user.user_id && (
        <div className="mt-6 container">

          <article className="message is-info">
            <div className="message-body">
     Please choose options from the top menu
            </div></article>
        </div>
      )}
    </div>
  )
}

async function generateAccessToken(requestToken) {
  console.log("Generating session from requesttoken", requestToken)
  try {
    let response = await kc.generateSession(requestToken, "60960qn0cpdca5m4o5lymxpj05xz0hcl");

    if (response.access_token) {
      return response.access_token;
    } else {
      console.log('failed', response)
    }
  } catch (e) {
    console.log(e)
    throw new Error("Failed to generate accessToken");
  }
}

export async function getServerSideProps(ctx) {
  let { req, res, query } = ctx;
  // console.log(ctx)
  let host = req.headers.host;
  console.log(13,host)
  // console.log(req.query.host , host, req.query.request_token)
  if(query.host && query.host != host){
    let request_token = query.request_token;    
    if(query.host.search('localhost') >= 0){
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
  let user;
  await dbConnect()

  if(userProfile.user_id){
    user = await getUser(userProfile.user_id);
    if(!user){
      user = await createUser(userProfile);
    }else{
      user = await updateUser(user);
      if(validateUser(user)){
        console.log("On Trail");
      }else{
        console.log("Trail Expired");
      }
    }
  }

  if(userProfile.user_id){
    res.writeHead(301, { Location: `/positions`});
    return res.end()
  }

  return {
    props: {
      user:user?.toObject()||{}
    }
  }

}
