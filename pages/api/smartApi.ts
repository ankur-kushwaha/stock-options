import { NextApiRequest, NextApiResponse } from "next";
let { SmartAPI, WebSocket } = require("smartapi-javascript");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  let token = req.cookies['token']
  let query: Record<string, string> = (req.query || {}) as Record<string, string>
  let body = req.body;

  let smart_api = new SmartAPI({
    api_key: process.env.SMARTAPI_KEY,
    access_token: token
  });

  let response;

  if (body) {
    response = await smart_api[query.method](JSON.parse(body));
  } else {
    response = await smart_api[query.method]();
  }

  res.json({ status: 200, response, method: query.method, body:JSON.parse(body) });

}
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}