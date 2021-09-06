import { getKiteClient } from "../../helpers/kiteConnect";


export default async function createOrder(req, res) {


        
  let kt = await getKiteClient(req.cookies);

  let {tradingsymbol,quantity,price,transactionType} = req.query;

  let reqData;
  
  reqData={
    exchange:"NFO",
    tradingsymbol,
    transaction_type:transactionType,
    validity:'DAY',
    quantity, 
    order_type:"LIMIT",
    price,
    product:"NRML"
  }

  if(price == 'MARKET'){
    reqData={
      exchange:"NFO",
      tradingsymbol,
      transaction_type:transactionType,
      validity:'DAY',
      quantity, 
      order_type:"MARKET",
      product:"NRML"
    }
  }

  console.log('Creating order with', reqData);
        
  kt.placeOrder("amo",reqData).then(data=>{
    console.log(data)
    
    // res.writeHead(307, { Location: `https://kite.zerodha.com/orders`})
    // return res.end();
    return res.status(200).json({ data })
  })
    .catch(data=>{
      console.log(data)
      res.status(200).json({ status: 'failed',error:data })
    })



    
    
}
  