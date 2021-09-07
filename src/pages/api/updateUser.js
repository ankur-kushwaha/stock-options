// import { getKiteClient } from "../../helpers/kiteConnect";
const User = require('../../models/user');


export default async function handler(req, res) {
  
  let {userId,configs,orders,shortOrders,session,tradingsymbol} = req.body;
  let user = await  User.findOne({user_id:userId });
  
  user.configs = configs;
  user.orders = orders;
  user.shortOrders = shortOrders;

  let userSessions = user.sessions.toObject()||[]

  if(session){
    
    userSessions = userSessions.filter(item=>item.tradingsymbol != tradingsymbol);

    userSessions.push({
      tradingsymbol:session.configs.tradingsymbol,
      data:session
    })
  }

  user.sessions = userSessions;
  
  let updateuser = await user.save(); 

  return res.status(200).json({user:updateuser});
}
