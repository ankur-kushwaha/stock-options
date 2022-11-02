import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../mongodb";


export default async function handler(req: NextApiRequest, res:NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("myFirstDatabase");
  const instruments = await db.collection("allStocks").distinct('name',{exchange:"NFO","segment": "NFO-OPT",});
  res.json({ status: 200, data: instruments });
}