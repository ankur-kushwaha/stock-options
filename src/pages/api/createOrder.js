import { getKiteClient } from "../../helpers/kiteConnect";
let { SmartAPI, WebSocket } = require("smartapi-javascript");

let smart_api = new SmartAPI({
  api_key: "bMhFOYF3",    // PROVIDE YOUR API KEY HERE
  // OPTIONAL : If user has valid access token and refresh token then it can be directly passed to the constructor. 
  access_token: "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6IkE2MzE0NDkiLCJyb2xlcyI6MCwidXNlcnR5cGUiOiJVU0VSIiwiaWF0IjoxNjMwNTk5NDcwLCJleHAiOjE3MTY5OTk0NzB9.rUqZRJPamffC6lnhbnDamhcOBIIuipvDr0c2Talrk8_MZZX-r2nk4UJ6m9X-rIKupRhPPzjcHjv5TWKp2xMCEg",
  refresh_token: "eyJhbGciOiJIUzUxMiJ9.eyJ0b2tlbiI6IlJFRlJFU0gtVE9LRU4iLCJpYXQiOjE2MzA1OTk0NzB9.vLt-o0u0cf-5LY2oxIGRjNlatqiSbzsRjA1Qtn5TVHorTDMRv_rtQOcCxH493Wvv8ZNQ8OgXqV1PUWkKoas0sw"
});

async function createOrderAngelOne(req,res){
  await smart_api.generateSession("A631449", "Kushwaha1@")

  let {client,tradingsymbol,quantity,price,transactionType,variety} = req.query;
  
  let response = await smart_api.placeOrder({
    "exchange":"NSE",
    "tradingsymbol":"INFY-EQ",
    "symboltoken":"408065",
    "quantity":quantity||5,
    "transactiontype":transactionType||"BUY",
    "ordertype":"MARKET",
    "variety":variety||"NORMAL",
    "producttype":"DELIVERY"
  })

  res.status(200).json(response);


}


export default async function createOrder(req, res) {

  
        
  let kt = await getKiteClient(req.cookies);

  let {client,tradingsymbol,quantity,price,transactionType,variety} = req.query;

  if(client == 'angelOne'){
    return await createOrderAngelOne(req,res)
  }

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
  