// import { getKiteClient } from "../../helpers/kiteConnect";
const User = require('../../models/user');


export default async function handler(req, res) {
  
  let {userId,configs,orders,shortOrders} = req.body;
  let user = await  User.findOne({user_id:userId });
  
  console.log(user,{user_id:userId });
  user.configs = configs;
  user.orders = orders;
  user.shortOrders = shortOrders;

  let updateuser = await user.save(); 

  return res.status(200).json({user:updateuser});
}
