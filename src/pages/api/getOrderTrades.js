
import { getKiteClient } from "../../helpers/kiteConnect";


export default async function handler(req, res) {
  let {orderId} = req.query
  let kt = await getKiteClient(req.cookies);
  let response = await kt.getOrderTrades(orderId);
  return res.status(200).json(response);
     
}
  