
import { getKiteClient } from "../../helpers/kiteConnect";

export default async function createOrder(req, res) {
  let body = req.body;
  let kt = await getKiteClient(req.cookies);
  let response  = await kt.modifyOrder(body.variety,body.orderId,body.params);
  return res.status(200).json(response);
}