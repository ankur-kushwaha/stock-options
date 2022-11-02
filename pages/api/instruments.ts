// @ts-nocheck 
import { NextApiRequest } from "next";
import clientPromise from "../../mongodb";

export default async function handler(req: NextApiRequest, res) {
  const client = await clientPromise;
  const db = client.db("myFirstDatabase");
  const instruments = await db.collection("allStocks").find({exchange:"NSE",segment:"NSE",instrument_type:"EQ",name:{$ne:""}}).toArray();
  res.json({ status: 200, data: instruments });
}