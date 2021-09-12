import React from 'react'
import Price from '../components/Price';
import Header from '../components/Header';
import Table from '../components/Table'
import { getKiteClient } from '../helpers/kiteConnect';
import User from '../models/user'
import getTicks from '../helpers/getTicks';

export default function Orders({ userProfile }) {
  console.log(userProfile)
  

  let orderColumns = [{
    name: 'Tradingsymbol',
    selector: 'tradingsymbol',
    wrap: true,
    cell:row=><a rel="noreferrer" href={`/BuySell?tradingsymbol=${row.tradingsymbol}`} >{row.tradingsymbol}</a>
  }, {
    name: 'Open Orders',
    selector: 'orderCount',
    grow: 1
  }, {
    name: 'Short Orders',
    selector: 'shortOrdersCount'
  }, {
    name: 'Closed Orders',
    selector: 'closedOrdersCount',
    wrap: true
  },{
    name: 'Closed Orders Profits',
    selector: 'closedOrderProfit',
    wrap: true,
    cell:row=><Price>{row.closedOrderProfit}</Price>
  },
  {
    name: 'Running',
    selector: 'isRunning',
    wrap: true,
    cell:row=><>{row.isRunning?"Running":'Stopped'}</>
  }].map(item=>{
    item.sortable = true;
    return item;
  });




  const orders = userProfile.sessions
    .filter(item=>item.tradingsymbol)
    .map(item=>{

      let closedOrderProfit = item.data.closedOrders?.map(order=>order.pnl).reduce((a,b)=>a+b,0)||0;

      return{
        tradingsymbol:item.tradingsymbol,
        orderCount:item.data.orders?.length||0,
        shortOrdersCount:item.data.shortOrders?.length||0,
        closedOrdersCount:item.data.closedOrders?.length||0,
        closedOrderProfit,
        isRunning:item.data.configs.shouldRun
      }
    }).filter(item=>{
      return item.orderCount||item.shortOrdersCount||item.closedOrdersCount||item.isRunning
    })

  return(
    <div> 
        
      <Header/>
      <div className="container mt-5">
        <Table title={"Orders Summary"} columns={orderColumns} data={orders}></Table>
      </div>

    </div>
  )
}

export async function getServerSideProps(ctx) {
  let kc
  let { req, res } = ctx;
  let userProfile, positions = {}, quotes = [];

  try {
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  } catch (e) {
    console.log('error', e)
  }



  if (!userProfile) {
    res.writeHead(307, { Location: `/` })
    return res.end()
  }

  let dbUser = (await User.findOne({ user_id: userProfile.user_id })).toObject();

  userProfile.sessions = dbUser.sessions;

  return {
    props: {
      userProfile
    }
  }


}