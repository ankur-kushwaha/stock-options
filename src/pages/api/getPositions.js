import { getKiteClient } from "../../helpers/kiteConnect";

export default async function handler(req,res) {
  let kt = await getKiteClient(req.cookies);
  let response  = await kt.getPositions();
  return res.status(200).json(response);

}
  
