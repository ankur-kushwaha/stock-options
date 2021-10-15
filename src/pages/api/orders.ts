import { getKiteClient } from "../../helpers/kiteConnect";
const UserOrders = require('../../models/UserOrders');


export default async function handler(req, res) {
  let {userId,orders} = req.body
  let userOrders = await UserOrders.findOne({ userId})
  if(userOrders){
    userOrders.orders = orders;
    await userOrders.save()
  }else{
    await UserOrders.create({
      userId,
      orders
    })
  }
    
  
  res.status(200).json({ orders})
}
