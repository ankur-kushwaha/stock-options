import { getKiteClient } from "../../helpers/kiteConnect";
const User = require('../../models/user');


export default async function handler(req, res) {
  console.log(req.body);
  let {userId,configs,orders} = req.body;
  let user = await  User.findOne({user_id:userId });
  
  console.log(user,{user_id:userId });
  user.configs = configs;
  user.orders = orders;

  let updateuser = await user.save(); 

  return res.status(200).json({user:updateuser});
}
