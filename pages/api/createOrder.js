import { getKiteClient } from "../../helpers/kiteConnect";


export default async function createOrder(req, res) {


        console.log(req.cookies);
        let kt = await getKiteClient(req.cookies);

        let {tradingsymbol,quantity,price,transactionType} = req.query;

        let reqData={
            exchange:"NFO",
            tradingsymbol,
            transaction_type:transactionType,
            validity:'DAY',
            quantity,
            order_type:"LIMIT",
            price,
            product:"NRML"
        }

        console.log(reqData);
        
        kt.placeOrder("regular",reqData).then(data=>{
            console.log(data)
            res.status(200).json({ status: 'success' })
        })
        .catch(data=>{
            console.log(data)
            res.status(200).json({ status: 'failed',error:data })
        })
        
    
}
  