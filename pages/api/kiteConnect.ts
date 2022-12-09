import { API_KEY, cookieName } from "../../components/contants"
import Cookies from 'cookies';
import { NextApiRequest } from "next";

export default async function handler(req: NextApiRequest, res:any) {
  const { api } = req.query
  const {queryParam,body,method} = JSON.parse(req.body);
  const cookies = new Cookies(req, res)
  // console.log('url',`https://api.kite.trade/${api}?${queryParam}`);
  let response,url;
  if(method == 'POST'){
    url = `https://api.kite.trade/${api}`
    // console.log(body);
    

    response = await fetch(url, {
      body:JSON.stringify(body),
      method:"POST",
      headers: {
        Authorization: `token ${API_KEY}:${cookies.get(cookieName)}`,
        "X-Kite-Version": "3"
      }
    }).then(res => res.json())

  }else{

    url = `https://api.kite.trade/${api}?${queryParam}`
    response = await fetch(url, {
      headers: {
        Authorization: `token ${API_KEY}:${cookies.get(cookieName)}`,
        "X-Kite-Version": "3"
      }
    }).then(res => res.json())
  }

  res.status(200).json({ 
    request:{
      url,
      method,
      body,
      queryParam
    },
    response: response 
  })
}

export const config = {
  api: {
    responseLimit: false,
  },
}