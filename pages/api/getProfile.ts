import { NextApiRequest, NextApiResponse } from "next";

let { SmartAPI, WebSocket } = require("smartapi-javascript");


export default async function handler(req: NextApiRequest, res:NextApiResponse) {

  let smart_api = new SmartAPI({
    api_key: process.env.SMARTAPI_KEY,    
  });
  

  console.log(process.env.SMARTAPI_CLIENT_CODE, process.env.SMARTAPI_PASSWORD);
  
  
  let profile =  await smart_api.generateSession(process.env.SMARTAPI_CLIENT_CODE, 9999);

  //kishore
  //lalit

  // 4*6 24 110*4
  // p5 40 * 4

  console.log(profile);
  res.json({ status: 200, data:[] });
  
}