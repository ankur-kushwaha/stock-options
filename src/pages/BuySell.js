import React from 'react'
import Header from '../components/Header';
import Price from '../components/Price';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import { postData } from '../helpers';
import { useRouter } from 'next/router'
import User from '../models/user'
import BuySellConfig from '../components/BuySellConfig';
import Head from 'next/head'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default function BuySell({
  userProfile
}) {
  let {query} = useRouter();
  let {tradingsymbol} = query;

  let {createOrder2,getHistory} = useZerodha();
  let [history,setHistory] = React.useState([]);
  let [logs,setLogs] = React.useState([]);

  let defaultConfig = {
    maxOrder: userProfile.configs.maxOrder || 3,
    maxShortOrder: userProfile.configs.maxShortOrder || 1,
    minTarget:  userProfile.configs.minTarget || 10,
    quantity : userProfile.configs.quantity || 100,
    isBullish: !!userProfile.configs.isBullish,
    isBearish: !!userProfile.configs.isBearish,
    marketOrder: !!userProfile.configs.marketOrder
  }
  const [config,setConfig] = React.useState(defaultConfig);
  
  let [state,setState] = React.useState({
    positions:[],
    hasOrdersUpdated:0,
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders: userProfile.orders?.filter(item=>item.tradingsymbol == tradingsymbol),
    shortOrders: userProfile.shortOrders?.filter(item=>item.tradingsymbol == tradingsymbol),
    closedOrders:[]
  });

  React.useEffect(()=>{
    log(userProfile);
  },[])

  React.useEffect(()=>{ 

    async function fetchHistory(){

      let regex = /NIFTY(.*)(\d{5})([C|P]E)/
    
      let map = {
        "21909":"09SEP21",
        "21916":"16SEP21",
        "21923":"23SEP21",
        "21930":"30SEP21"
      }

      let out = tradingsymbol.match(regex);
      let srcDate = out[1];
      let strike = out[2]
      let type = out[3];


      let targetTradingsymbol = `NIFTY${map[srcDate]}${strike}${type}`
      let res = await getHistory(targetTradingsymbol);

      if(config.shouldRun){
        setHistory(res.history);
      }
    }

    let interval = setInterval(fetchHistory,10000);
    if(config.shouldRun){
      fetchHistory();
    }
    return ()=>{
      clearInterval(interval);
    }
      
  },[config.shouldRun])

  React.useEffect(async ()=>{
    log("-----------------------------------------");
    
    if(history.length == 0){
      log('Returning as history length is 0');
      return ;
    }

    let item = history[history.length-1];
    log('history updated, last quote: ',item.actual.close ,item);

    let {tradeCount,profit} = state;
    let profitArr = [...state.profitArr];
    let orders = [...state.orders];
    let updatedShortOrders = [...state.shortOrders];
    let closedOrders = [...state.closedOrders];

    let newTrend = item.signal=='GREEN'?"UP":"DOWN";
    
    let trendReverse = false;
    if(state.currTrend && (state.currTrend != newTrend)){
      log("Trend reversed ", state.currTrend,newTrend);
      trendReverse = true;
    }else{
      log("Trend continuing... ", newTrend);
    }

    let hasOrdersUpdated = state.hasOrdersUpdated;
    

    if(trendReverse){
      if(newTrend == 'DOWN'){
        log('Trend reversed and moving downwards',item);
        //sell signal
        //sell all whose price is less than buy price;

        if(config.isBullish){

          log("Bullish flag is enabled, checking open orders ", orders);
        
          let executedOrders = [];
          for(let order of orders){
            if((item.actual.close - order.average_price) > ((config.minTarget * order.average_price)/100)){
              log('Triggering Sell order for', order);
            
              hasOrdersUpdated++;
              executedOrders.push(order.order_id);
            
              let currOrder = await createOrder(item);

              let currProfit = currOrder.average_price - order.average_price;
              order.buyPrice = order.average_price;
              order.sellPrice = currOrder.average_price;
              
              order.profit = currProfit;
              profit += currProfit;

              profitArr.push(currProfit);

            }else{
              log(`Sell order blocked, Min Change: ${(config.minTarget * order.average_price)/100}, Current Chg: ${item.actual.close - order.average_price}, BuyPrice: ${order.average_price}, LTP: ${item.actual.close}, MinTarget: ${config.minTarget}`);
            }
          }
          //Remove executed orders
          orders = orders.filter(item=>!executedOrders.includes(item.order_id));
          closedOrders.concat(orders.filter(item=>executedOrders.includes(item.order_id)))
        }
        if(config.isBearish && updatedShortOrders.length < config.maxShortOrder){
          log('Brearish flag is enabled, Triggering short order...');
          let currOrder = await createOrder(item,{
            transactionType:'SELL',
            quantity: config.quantity
          });
          if(currOrder){
            updatedShortOrders.push(currOrder);
            hasOrdersUpdated++;
          }
        }else{
          if(config.isBearish){
            log('Short order capacity reached', updatedShortOrders);
          }
        }

      }

      if( newTrend == 'UP' ){
      //Buy signal
        log('Trend reversed and moving upwards',item);

        if(config.isBullish){
        
          log("Bullish flag is enabled, checking open orders and maxOrders ", orders);
        
          if(orders.length < config.maxOrder){
            log('Triggerring BUY order....');

            let orderId = await createOrder2({
              transactionType:"BUY",
              tradingsymbol,
              quantity:config.quantity,
              price: config.marketOrder?'MARKET':item.actual.close
            });

            if(orderId == null){
              log("Create order failed");
              return ;
            }

            await sleep(1000);

            let allOrders = await fetch('/api/getOrders').then(res=>res.json())
            let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
            if(!currOrder){
              log('Invalid OrderID');
              return;
            }
            log(currOrder);
            tradeCount++;
            orders.push(currOrder);
            hasOrdersUpdated++;

          }else{
            log("BUY orders limit reached",orders);
          }
        }
        
        if(config.isBearish){
          log('Bearish flag is enabled, checking open short orders', updatedShortOrders);
          let executedOrders=[]
          for(let order of updatedShortOrders){
            if((order.average_price - item.close) > ((config.minTarget * item.close)/100)){
              log('Triggerring short cover...',order);
              let currOrder = await createOrder(item,{
                transactionType:'BUY',
                quantity:order.quantity
              });
              if(!currOrder){
                console.error('Short cover order failed');
              }
              executedOrders.push(order.order_id);
              hasOrdersUpdated++;
            }else{
              log('Order not eligible for covering',order);
            }
          }
          updatedShortOrders = updatedShortOrders.filter(item=>!executedOrders.includes(item.order_id))
        }
            
      } 
    }
    

    setState({
      hasOrdersUpdated,
      currTrend:newTrend,
      tradeCount,
      trendReverse,
      profit,
      closedOrders,
      orders,
      shortOrders:updatedShortOrders,
      profitArr,
      closePrice: item.actual.close
    })

  },[history.length])
  
  React.useEffect(async ()=>{
    if(!state.orders.length && !state.shortOrders.length){
      return;
    }
    let response = await fetch('/api/getPositions').then(res=>res.json());
    let positions  = response.net.filter(item=>item.tradingsymbol == tradingsymbol);
    setState({
      ...state,
      positions
    })

    await save();

  },[state.hasOrdersUpdated])

  async function createOrder(item,{
    transactionType,
    quantity
  }={}){
    
    let orderId = await createOrder2({  
      transactionType : transactionType||"SELL",
      tradingsymbol,
      quantity : quantity || config.quantity,
      price : config.marketOrder ? 'MARKET' : item.actual.close
    });

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    
    return currOrder;
  }

  const columns = [{
    name:'tradingsymbol',
    selector:'tradingsymbol'
  },
  
  {
    name:'buy_price',
    selector:'buy_price'
  },{
    name:'sell_price',
    selector:'sell_price'
  },{
    name:'average_price',
    selector:'average_price'
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'status',
    selector:'status'
  },{
    name:'pnl',
    selector:'pnl',
    // cell:row=>(<button onClick={sellStock(row)}>Sell</button>)
  }]

  const save = React.useCallback(async function save({
    newConfig,
    newOrders,
    newShortOrders
  }={}){
    let data = {
      userId:userProfile.user_id,
      configs:newConfig||config,
      orders:newOrders||state.orders,
      shortOrders:newShortOrders||state.shortOrders,
      tradingsymbol,
      session:{
        configs:newConfig||config,
        orders:newOrders||state.orders,
        shortOrders:newShortOrders||state.shortOrders,
      }
    };
    log('Saving user',data);
    await postData('/api/updateUser',data);
    
  },[config,state.orders,state.shortOrders])

  async function handleUpdate(config){
    setConfig(config);
    await save({newConfig:config});
  }

  let closedOrderColumns = [{
    name:'tradingsymbol',
    selector:'tradingsymbol',
    grow:1
  },{
    name:'order_id',
    selector:'order_id',
    grow:1
  },{
    name:'buyPrice',
    selector:'buyPrice'
  },{
    name:'sellPrice',
    selector:'sellPrice'
  },{
    name:'profit',
    selector:'profit'
  }]

  let orderColumns=[{
    name:'Tradingsymbol',
    selector:'tradingsymbol',
    wrap:true
  },{
    name:'Order ID',
    selector:'order_id',
    grow:1
  },{
    name:'Timestamp',
    selector:'order_timestamp',
    wrap:true
  },{
    name:'Quantity',
    selector:'quantity'
  },{
    name:'LTP',
    selector:'price',
    cell:()=>{state.closePrice}
  },{
    name:'Buy Price',
    selector:'average_price'
  },{
    name:'PnL',
    selector:'pnl',
    cell:(row)=>
      <div>
        <Price>{row.pnl}</Price><br/> (<Price>{row.pnlPct}</Price>)
      </div>
  }];

  async function cleanOrders(type){
    
    await save({
      newOrders:[],
      newShortOrders:[]
    })

    setState({
      ...state,
      orders
    })
  }

  function log(...args){
    console.log(args);
  }

  let totalProfit = 0;
  let orders = state.orders.map(row=>{
    row.pnl = (state.closePrice - row.average_price)* row.quantity;
    totalProfit += row.pnl;
    row.pnlPct = (state.closePrice - row.average_price)*100/row.average_price 
    return row;
  });

  return (
    <div >
      <Head>
        <title>
          {"PnL:"+totalProfit.toFixed(2)+" | "+(config.shouldRun?'Running... ':'Stopped')}
        </title>
      </Head>
      {/* <button onClick={save}>Save</button> */}
      <Header userProfile={userProfile} tab="positions"></Header>

      <div className="container mt-4">
        <div className="columns">
          <div className="column is-2">
            <article className={"message "+(config.shouldRun?'is-success':"is-danger")}>
              <div className="message-body">
                <BuySellConfig config={config} cleanOrders={cleanOrders} onUpdate={handleUpdate}></BuySellConfig>
              </div>
            </article>
          </div>

          <div className="column is-10">
            <Table title={"Open Orders"} columns={orderColumns} data={orders}></Table>
            {state.shortOrders.length>0 &&
            <Table title={"Open Short Orders"} columns={orderColumns} data={state.shortOrders}></Table>
            }
            {state.closedOrders.length>0 &&
            <Table title={"Booked Orders"} columns={closedOrderColumns} data={state.closedOrders}></Table>
            }
          </div>
        </div>
      </div>

      <div className="container mt-6">
        <article className={"message is-info"}>
          <div className="message-body">
            {logs.map((log,i)=><div className=" control is-size-7" key={i}>{JSON.stringify(log,null,2)}<br/><br/></div>)}
          </div>
        </article>       

      </div>

    
     

     
      
    </div>
  )
}

export async function getServerSideProps(ctx) {
  let {req} = ctx;
  let {tradingsymbol} = req.query;

  let kc,userProfile;
  kc = await getKiteClient(req.cookies);
  userProfile = await kc.getProfile();
  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();

  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];
  // console.log(123,session)

  userProfile.configs = session?.data.configs||dbUser.configs;
  if(session?.data.orders.length){
    userProfile.orders = session?.data.orders
  }else{
    userProfile.orders = dbUser.orders;
  }
  if(session?.data.shortOrders.length){
    userProfile.shortOrders = session?.data.shortOrders
  }else{
    userProfile.shortOrders = dbUser.shortOrders;
  }
  

  let positions = await kc.getPositions();

  positions = positions.net.filter(item=>{
    return item.tradingsymbol == tradingsymbol
  }).map(item=>{
    // item.fill_timestamp = JSON.stringify(item.fill_timestamp)
    // item.exchange_timestamp = JSON.stringify(item.exchange_timestamp)
    return item;
  });
  

  return {
    props:{
      positions,
      userProfile
    }
  }

}
