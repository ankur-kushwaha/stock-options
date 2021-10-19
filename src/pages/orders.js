import React,{useCallback,useEffect} from 'react'
import Price from '../components/Price';
import Header from '../components/Header';
import Table,{Column} from '../components/Table'
import { getKiteClient } from '../helpers/kiteConnect';
import User from '../models/user'
import UserOrders from '../models/UserOrders'
import getTicks from '../helpers/getTicks';
import dbConnect from '../middleware/mongodb';
import {postData} from '../helpers/fetch'

export default function Orders({ userProfile,orders,userOrders }) {
  
  
  

  const [savedOrders,setSavedOrders] = React.useState(userOrders.orders);
  
  const addAll = useCallback(
    () => {
      let newSavedOrders = [...savedOrders];
      for(let row of orders){
        let existing = !!savedOrders.find(item=>item.order_id == row.order_id);
        if(!existing){
          newSavedOrders.push(row);
        }
      }
      console.log(newSavedOrders)
      setSavedOrders(newSavedOrders);
    },
    [orders,savedOrders],
  )

  const orderColumns =[{
    name:'order_id',
    selector:"order_id"
  },{
    name:'tradingsymbol',
    selector:"tradingsymbol"
  },{
    name:'transaction_type',
    selector:"transaction_type"
  },{
    name:'status',
    selector:"status"
  },{
    name:'quantity',
    selector:"quantity"
  },{
    name:'price',
    selector:"price"
  },{
    name:'value',
    selector:"value"
  },{
    name:<button className="button is-small"  onClick={addAll}>Add all</button>,
    selector:"variety",
    cell:row=><button className="button is-small" onClick={handleSave(row)}>Add</button>
  }]

  const handleSave = useCallback(
    (row) =>()=> {
      
      let existing = !!savedOrders.find(item=>item.order_id == row.order_id);
      if(!existing){
        setSavedOrders([...savedOrders,row])
      }
    },
    [savedOrders],
  );

  const saveSavedOrders = useCallback(
    (savedOrders) => {
      postData('api/orders',{
        userId:userProfile.user_id,
        orders:savedOrders
      });
    },
    [], 
  )

  useEffect(() => {
    saveSavedOrders(savedOrders);
  }, [savedOrders])

  const handleDelete = useCallback(
    (row) =>()=> {
      setSavedOrders(savedOrders.filter(item=>item.order_id != row.order_id))
    },
    [savedOrders],
  )

  orders = orders.filter(item=>{
    return !savedOrders.map(o=>o.order_id).includes(item.order_id)
  })

  let processed = savedOrders.reduce((a,b)=>{
    
    if(a[b.tradingsymbol]){
      a[b.tradingsymbol].push(b);
    } else {
      a[b.tradingsymbol] = [b];
    }

    return a;
  },{});

  for(let key in processed){
    let orders = processed[key];
    let buyValue=0, sellValue=0, buyQuantity=0, sellQuantity=0;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if(order.transaction_type == 'BUY'){
        buyValue += order.value;
        buyQuantity +=order.quantity;
      }else{
        sellValue += order.value;
        sellQuantity += order.quantity
      }
    }
    processed[key] = {
      tradingsymbol:key,
      buyAvg:buyValue/buyQuantity,
      sellAvg:sellQuantity>0?sellValue/sellQuantity:"",
      quantity:buyQuantity-sellQuantity,
      pnl:sellQuantity&&buyQuantity?sellValue-buyValue:""
    }
  }

  return(
    <div> 
      <Header userProfile={userProfile}/>
      <div className="container mt-5 px-4 py-2">
        <div className="">

          <Table title={"Orders Summary"} data={Object.values(processed)}>
            <Column selector={"tradingsymbol"}></Column>
            <Column selector={"quantity"}></Column>
            <Column selector={"buyAvg"}></Column>
            <Column selector={"sellAvg"}></Column>
            <Column selector={"pnl"}></Column>
          </Table>
        

          <Table title={"Saved orders"} data={savedOrders}>
            <Column selector="tradingsymbol"></Column>
            <Column selector={"order_timestamp"} name="order_timestamp">{(row)=>new Date(JSON.parse(row.order_timestamp)).toLocaleDateString()}</Column>
            <Column selector="transaction_type"></Column>
            <Column selector="status"></Column>
            <Column selector="quantity"></Column>
            <Column selector="price"></Column>
            <Column selector="value"></Column>
            <Column name="Delete">
              {row=><button className="button is-small" onClick={handleDelete(row)}>Delete</button>}
            </Column>
          </Table>

          <Table title={"Kite orders"} columns={orderColumns} data={orders}>
          </Table>
        </div>
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
  let orders = await kc.getOrders();
  orders = orders
    .filter(item=>item.status=='COMPLETE')
    .map(item=>{
      item.value = item.quantity*item.price;
      item.order_timestamp = JSON.stringify(item.order_timestamp)
      item.exchange_timestamp = JSON.stringify(item.exchange_timestamp)
      return item;
    }).sort((a,b)=>a.tradingsymbol-b.tradingsymbol);

  await dbConnect();

  let dbUser = (await User.findOne({ user_id: userProfile.user_id })).toObject();
  let userOrders = (await UserOrders.findOne({userId:userProfile.user_id})).toObject()
  // console.log(userOrders)
  userOrders.lastLogin = userOrders.lastLogin||""
  userProfile.sessions = dbUser.sessions;

  return {
    props: {
      userProfile,
      orders,
      userOrders
    }
  }


}