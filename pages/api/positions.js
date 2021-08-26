import { getKiteClient } from "../../helpers/kiteConnect";


export default async function handler(req, res) {
  let kc = await getKiteClient(req.cookies);
  let positions = await kc.getPositions();
  res.status(200).json({ positions: positions })
}
