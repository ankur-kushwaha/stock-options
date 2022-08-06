
import { getKiteClient } from "../../helpers/kiteConnect";

export default async function handler(req,res) {
  let kt = await getKiteClient(req.cookies);
  let {method,args="[]"} = req.query
  
  args = JSON.parse(args);

  console.log('KiteConnect',{
    method,
    args
  });
  
  try{
    let response  = await kt[method](...args);
    return res.status(200).json(response);
  }catch(e){
    console.log('KiteConnect',e);
    return res.status(500).json(e);
  }
  
}
  
