import { getKiteClient } from "../../helpers/kiteConnect";


export default async function createOrder(req, res) {


        
  let kt = await getKiteClient(req.cookies);

  let {tradingsymbol,quantity,price,transactionType,variety} = req.query;

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
        
  kt.placeOrder(variety||"regular",reqData).then(data=>{
    console.log('Order placed',data)
    
    return res.status(200).json({ data })
  })
    .catch(data=>{
      console.log(data)
      res.status(200).json({ status: 'failed',error:data })
    })



    
    
}
  