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
    tradingsymbol,
    maxOrder: userProfile.configs?.maxOrder || 3,
    maxShortOrder: userProfile.configs?.maxShortOrder || 1,
    minTarget:  userProfile.configs?.minTarget || 10,
    quantity : userProfile.configs?.quantity || 100,
    isBullish: !!userProfile.configs?.isBullish,
    isBearish: !!userProfile.configs?.isBearish,
    marketOrder: !!userProfile.configs?.marketOrder
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
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == tradingsymbol)||[],
  });

  React.useEffect(()=>{
    log(userProfile);
  },[])

  React.useEffect(()=>{ 

    async function fetchHistory(){

      let res = await getHistory(tradingsymbol);

      if(config.shouldRun){
        setHistory(res.history);
      }
    }

    let interval;
    if(config.shouldRun){
      interval = setInterval(fetchHistory,10000);
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
          closedOrders = closedOrders.concat(orders.filter(item=>executedOrders.includes(item.order_id)))
          orders = orders.filter(item=>!executedOrders.includes(item.order_id));
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

  const save = React.useCallback(async function save({
    newConfig,
    orders,
    shortOrders,
    closedOrders
  }={}){
    let data = {
      userId:userProfile.user_id,
      tradingsymbol,
      session:{
        configs:newConfig||config,
        orders:orders||state.orders,
        shortOrders:shortOrders||state.shortOrders,
        closedOrders:closedOrders||state.closedOrders
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
    cell:()=><>{state.closePrice}</>
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
  },{
    name:"Buy/Sell",
    cell:row=><button className="button is-small" onClick={closePosition(row)}>Close Now</button>
  }];

  const closePosition = (row)=>async ()=>{
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];
    orders = orders.filter(item=>item.order_id != row.order_id);

    setState({
      ...state,
      orders
    })

    let currOrder = await createOrder({
      actual:{
        close:state.closePrice
      }
    },{
      transactionType:row.quantity>0?'SELL':'BUY',
      quantity:row.quantity
    })
    if(currOrder){
      let sellPrice = currOrder.average_price;
      row.sellPrice = sellPrice;
      row.buyPrice = row.average_price;
      let profit = sellPrice - row.average_price;
      row.profit = profit;
  
      closedOrders.push(row);

      await save({
        orders,
        closedOrders
      });

      setState({
        ...state,
        orders,
        closedOrders
      })
  
      
    }else{
      log('Sell order failed ',row);
    }
    
  }

  async function cleanOrders(){
    
    setState({
      ...state,
      orders:[],
      closedOrders:[]
    })

    await save({
      orders:[],
      closedOrders:[],
      shortOrders:[]
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

      <div className="container mt-5">

        <div className="columns is-gapless">

          <div className="column is-3">
            
            
            <BuySellConfig config={config} cleanOrders={cleanOrders} onUpdate={handleUpdate}></BuySellConfig>
             
          </div>

          <div className="column">
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

  userProfile.configs = session?.data.configs||dbUser.configs||{};
  userProfile.orders = session?.data.orders||[]
  userProfile.shortOrders = session?.data.shortOrders||[];
  userProfile.closedOrders = session?.data.closedOrders||[];
  

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
