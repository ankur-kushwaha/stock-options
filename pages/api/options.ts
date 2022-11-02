import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../mongodb";

type QueryParam = {
  name: string,
  "segment": string
  "exchange": string;
  expiry?: any
}

export default async function handler(req: NextApiRequest, res:NextApiResponse) {
  const { name, expiry } = req.query;

  if (!name) {
    res.json({ status: 404, data: [] });
    return;
  }

  const query: QueryParam = {
    name: name as string,
    "segment": "NFO-OPT",
    "exchange": "NFO",
    expiry:{
      $lte:"2023-12-31"
    }
  }

  if (expiry) {
    query.expiry = expiry as string
  }

  const client = await clientPromise;
  const db = client.db("myFirstDatabase");
  const posts = await db.collection("allStocks").find(query).toArray();

  res.json({ status: 200, data: posts });
}