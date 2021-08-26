import { getKiteClient } from "../../helpers/kiteConnect";


export default async function handler(req, res) {
  let kc = await getKiteClient(req.cookies);
  let instruments = req.query.instruments
    .split(",");
  console.log(instruments); 
  let quotes = await kc.getQuote(instruments);
  res.status(200).json({quotes})
}
