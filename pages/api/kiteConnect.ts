import { API_KEY, cookieName } from "../../components/contants"
import Cookies from 'cookies';
import { NextApiRequest } from "next";

export default async function handler(req: NextApiRequest, res:any) {
  const { api } = req.query
  const {queryParam} = JSON.parse(req.body);
  const cookies = new Cookies(req, res)
  // console.log('url',`https://api.kite.trade/${api}?${queryParam}`);
  
  const response = await fetch(`https://api.kite.trade/${api}?${queryParam}`, {
    headers: {
      Authorization: `token ${API_KEY}:${cookies.get(cookieName)}`,
      "X-Kite-Version": "3"
    }
  }).then(res => res.json())

  res.status(200).json({ response: response })
}

export const config = {
  api: {
    responseLimit: false,
  },
}