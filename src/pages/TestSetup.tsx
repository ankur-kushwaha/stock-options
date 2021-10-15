
import React from 'react'
import BuySellConfig from '../components/BuySellConfig';
import Header from '../components/Header';
import Table from '../components/Table';
import getTicks from '../helpers/getTicks';
import { getKiteClient } from '../helpers/kiteConnect';
import {useAutoTrade2} from '../helpers/useAutoTrade';
import useZerodha from '../helpers/useZerodha';
import dbConnect from '../middleware/mongodb';
import User from '../models/user';

export default function TestSetup({
  userProfile,
  stockQuote,
  query
}) {

  // console.log(stockQuote)
  
  const [config,setConfig]  = React.useState({
    ...userProfile.configs,
    ...query
  });
  // const [orders,setOrders]  = React.useState([]);
  const [kiteOrders,setKiteOrders]  = React.useState([]);
  const [tick,setTick]  = React.useState({
    depth:null
  });
  let {createOrder2} = useZerodha();

  React.useEffect(()=>{
    let token = stockQuote.instrument_token;
    getTicks([token],(ticks)=>{
      let tick = ticks[token];
      console.log('tick',tick);
      
      setTick(tick)
    });

  },[]);

  const refreshOrders = React.useCallback(async (orders)=>{
    let response = await fetch('/api/getOrders').then(res=>res.json());
    let responseMap = response.reduce((a,b)=>{
      a[b.order_id] = b;
      return a;
    },{})
    console.log(orders);
    
    let kiteOrders = orders.map(orderId=>responseMap[orderId])
    setKiteOrders(kiteOrders);
  },[])

  const createOrder = async ({
    transactionType,quantity
  })=>{
    let instrument = `${query.exchange}:${query.tradingsymbol}`
    let response = await fetch(`/api/getQuote?instruments=${instrument}`).then(res=>res.json())
    let depth = response.quotes[instrument].depth
    let buyPrice = (depth.buy[0].price+depth.sell[0].price)/2 
    
    let orderId = await createOrder2({
      "exchange":config.exchange,
      "price":buyPrice,
      "quantity":quantity||config.quantity,
      "tradingsymbol":config.tradingsymbol,
      "transactionType":transactionType||"BUY"
    })
    
    return orderId
  }

  async function buyCallback(){
    let orderId = await createOrder({
      transactionType:"BUY",
      quantity:config.quantity
    });
    let orders = config.orders||[];
    let updatedOrders = [...orders,orderId];
    await refreshOrders(updatedOrders);
    setConfig({
      ...config,
      orders:updatedOrders
    })
  }
  
  let {start:startTrade,stop:stopTrade} = useAutoTrade2({
    tradingsymbol:stockQuote.tradingsymbol,
    "exchange":"NSE",
    "interval":"ONE_MINUTE"
  },{
    "buy":buyCallback
    ,sell:function(...args){
      console.log('sell',args)
    }
  });

  const sellOrder = (row)=>async(e)=>{
    let orderId = await createOrder({
      quantity:row.quantity,
      transactionType:"SELL"
    })
    let updatedOrders = [...config.orders,orderId];
    await refreshOrders(updatedOrders);
  };

  let columns = React.useRef([{
    selector:"order_id",
    name:"orderId"
  },{
    selector:"status",
    name:"status"
  },{
    selector:"transaction_type",
    name:"transaction_type"
  },{
    selector:"Sell",
    name:"sell",
    cell:row=><>
      <button onClick={sellOrder(row)}>
    Sell
      </button>
    </>
  }]);

  let data = kiteOrders;

  function handleUpdate(newConfig){
    console.log('Save config',newConfig)
    setConfig({
      ...config,
      ...newConfig
    })
  }


  return (
    <div>
      <Header userProfile={userProfile}/>
      <div className="columns">
        <div className="column is-3">
          <BuySellConfig config={config} onUpdate={handleUpdate}/>
        </div>
        <div className="column">
          <Table columns={columns.current} data={data}></Table>
          <button onClick={startTrade}>Start</button>  
          <button onClick={stopTrade}>Stop</button>  
          <button onClick={refreshOrders}>Refresh</button>  
        </div>
      </div>
      
      
    </div>
  )
}

export async function getServerSideProps(ctx) {
  let {req,res,query} = ctx;
  let {tradingsymbol} = query;

  let kc,userProfile;
  try{
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  }catch(e){
    console.log(e)
    res.writeHead(307, { Location: `/`})
    res.end()
  }
  
  await dbConnect();
  

  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();

  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];

  userProfile.configs = session?.data.configs||dbUser.configs||{};
  userProfile.orders = session?.data.orders||[]
  userProfile.pendingOrders = session?.data.pendingOrders||[]
  userProfile.closedOrders = session?.data.closedOrders||[];
  let stock = /([A-Z]*)\d.*/.exec(tradingsymbol)[1];

  if(stock=='NIFTY'){
    stock = 'NIFTY 50'
  }

  let stockQuote = await kc.getQuote("NSE:"+stock);
  delete stockQuote["NSE:"+stock].timestamp;

  return {
    props:{
      userProfile,
      query,
      stockQuote:stockQuote["NSE:"+stock]
    }
  }
}