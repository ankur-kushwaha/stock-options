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
import { useToasts } from 'react-toast-notifications'


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default function BuySell({
  userProfile
}) {
  const { addToast } = useToasts()

  let {query} = useRouter();
  let {tradingsymbol} = query;

  let {createOrder2,getHistory} = useZerodha();
  let [history,setHistory] = React.useState([]);

  let defaultConfig = {
    tradingsymbol,
    maxOrder: userProfile.configs?.maxOrder || 3,
    maxShortOrder: userProfile.configs?.maxShortOrder || 1,
    minTarget:  userProfile.configs?.minTarget || 10,
    quantity : userProfile.configs?.quantity || 100,
    isBullish: !!userProfile.configs?.isBullish,
    isBearish: !!userProfile.configs?.isBearish,
    marketOrder: !!userProfile.configs?.marketOrder,
    interval:userProfile.configs?.interval||'ONE_MINUTE'
  }
  const [config,setConfig] = React.useState(defaultConfig);
  
  let [state,setState] = React.useState({
    hasOrdersUpdated:0,
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders: userProfile.orders?.filter(item=>item.tradingsymbol == tradingsymbol),
    shortOrders: userProfile.shortOrders?.filter(item=>item.tradingsymbol == tradingsymbol),
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == tradingsymbol)||[],
    closePrice:0
  });

  React.useEffect(()=>{
    log(userProfile);

    fetch('api/getQuote?instruments=NFO:'+tradingsymbol).then(res=>res.json()).then(res=>{
      let quote = res.quotes['NFO:'+tradingsymbol];
      setState({
        ...state,
        closePrice:quote.depth.buy[0].price||quote.last_price
      })
    });
    
  },[])

  // Trigger trading
  React.useEffect(()=>{ 

    async function fetchHistory(){

      let res = await getHistory(tradingsymbol,{
        interval:config.interval
      });

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

  async function triggerBuyOrder(item){
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
    if(!currOrder || currOrder.status != 'COMPLETE'){
      log('Invalid OrderID');
      return;
    }
    return currOrder;
    
  }

  async function triggerSellOrder(order,item){
    log('Triggering Sell order for', order);

    let orderId = await createOrder2({  
      transactionType : "SELL",
      tradingsymbol,
      quantity : order.quantity,
      price : config.marketOrder ? 'MARKET' : item.actual.close
    });

    await sleep(1000);

    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];

    if(!currOrder || currOrder.status != 'COMPLETE'){
      log("Sell Order failed");
      return;
    }


    order.buyPrice = order.average_price;
    order.sellPrice = currOrder.average_price||currOrder.price;
    order.profit = ( order.sellPrice - order.buyPrice ) * order.quantity;
    order.closingOrder = currOrder;

    return order;

  }

  async function triggerShortOrder(item){
    let currOrder = await createOrder(item,{
      transactionType:'SELL',
      quantity: config.quantity
    });
    if(!currOrder || currOrder.status != 'COMPLETE'){
      log('Short Order failed');
      return;
    }
    return currOrder;
  }

  async function triggerShortCover(order,item){
    

    let currOrder = await createOrder(item,{
      transactionType:'BUY',
      quantity:order.quantity
    });
    if(!currOrder || currOrder.status != 'COMPLETE'){
      console.error('Short cover order failed');
      return;
    }

    order.buyPrice = currOrder.average_price||currOrder.price;
    order.sellPrice = order.average_price;

    order.profit = ( order.sellPrice - order.buyPrice ) * order.quantity;
    order.closingOrder = currOrder;

    return order;
  }

  // Buy/Sell
  React.useEffect(async ()=>{
    
    
    if(history.length == 0){
      return ;
    }

    let item = history[history.length-1];
    log('history updated, last quote: ',item.actual.close ,item);

    let {tradeCount,profit} = state;
    let profitArr = [...state.profitArr];
    let orders = [...state.orders];
    let shortOrders = [...state.shortOrders];
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
            let buyPrice = order.average_price||order.price;
            if((item.actual.close - buyPrice) > ((config.minTarget * buyPrice)/100)){
              let closedOrder = await triggerSellOrder(order,item);
              if(closedOrder){
                executedOrders.push(closedOrder.order_id);
                hasOrdersUpdated++;
              }
            }else{
              log(`Sell order blocked, Min Change: ${(config.minTarget * buyPrice)/100}, Current Chg: ${item.actual.close - buyPrice}, BuyPrice: ${buyPrice}, LTP: ${item.actual.close}, MinTarget: ${config.minTarget}`);
            }
          }
          //Remove executed orders
          closedOrders = closedOrders.concat(orders.filter(item=>executedOrders.includes(item.order_id)))
          orders = orders.filter(item=>!executedOrders.includes(item.order_id));
        }
        if(config.isBearish && shortOrders.length < config.maxShortOrder){
          log('Brearish flag is enabled, Triggering short order...');
          let currOrder = await triggerShortOrder(item);
          if(currOrder){
            shortOrders.push(currOrder);
            hasOrdersUpdated++;
          }
        }else{
          if(config.isBearish){
            log('Short order capacity reached', shortOrders);
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

            let newBuyOrder = await triggerBuyOrder(item);
            if(newBuyOrder){
              orders.push(newBuyOrder);
              hasOrdersUpdated++;
            }

          }else{
            log("BUY orders limit reached",orders);
          }
        }
        
        if(config.isBearish){
          log('Bearish flag is enabled, checking open short orders', shortOrders);
          let executedOrders=[]
          for(let order of shortOrders){
            if((order.average_price - item.actual.close) > ((config.minTarget * item.actual.close)/100)){
              log('Triggerring short cover...',order);
              let soldOrder = await triggerShortCover(order,item);
              if(soldOrder){
                executedOrders.push(soldOrder.order_id);
                hasOrdersUpdated++;
              }
            }else{
              log('Order not eligible for covering',order);
            }
          }
          closedOrders = closedOrders.concat(shortOrders.filter(item=>executedOrders.includes(item.order_id)))
          shortOrders = shortOrders.filter(item=>!executedOrders.includes(item.order_id))
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
      shortOrders,
      profitArr,
      closePrice: item.actual.close
    })

  },[history.length])

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
    addToast('Saving User');
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
    name:'quantity',
    selector:'quantity'
  },{
    name:'buyPrice',
    selector:'buyPrice'
  },{
    name:'sellPrice',
    selector:'sellPrice'
  },{
    name:'profit',
    selector:'profit',
    cell:row=><Price>{row.profit}</Price>
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
    name:'Status',
    selector:'status'
  },{
    name:'LTP',
    selector:'price',
    cell:()=><>{state.closePrice}</>
  },{
    name:'Buy/Sell Price',
    selector:'average_price',
    cell:row=><>{row.average_price||row.price}</>
  },{
    name:'PnL',
    selector:'pnl',
    cell:(row)=>
      <div>
        <Price>{row.profit}</Price><br/> (<Price>{row.profitPct}</Price>)
      </div>
  },{
    name:"Buy/Sell",
    cell:row=><button className="button is-small" onClick={closePosition(row)}>Close Now</button>
  }];

  const closePosition = (order)=>async ()=>{
    let orders = [...state.orders];
    let shortOrders = [...state.shortOrders];
    let closedOrders = [...state.closedOrders];

    if(order.transaction_type == 'BUY'){
      orders = orders.filter(item=>item.order_id != order.order_id);
    }else{
      shortOrders =  shortOrders.filter(item=>item.order_id != order.order_id);
    }

    setState({
      ...state,
      orders,
      shortOrders
    })

    let currOrder = await createOrder({
      actual:{
        close:state.closePrice
      }
    },{
      transactionType:order.transaction_type=='BUY'?'SELL':'BUY',
      quantity:order.quantity
    })

    if(currOrder){
      let sellPrice,buyPrice;

      if(order.transaction_type=='BUY'){
        buyPrice = order.average_price;
        sellPrice = currOrder.average_price || currOrder.price;
      }else{
        sellPrice = order.average_price;
        buyPrice = currOrder.average_price || currOrder.price
      }

      order.sellPrice = sellPrice;
      order.buyPrice = order.average_price;
      order.profit = (sellPrice - buyPrice) * order.quantity;
      order.profitPct = (sellPrice - buyPrice)/buyPrice*100;
  
      closedOrders.push(order);

      await save({
        orders,
        shortOrders,
        closedOrders
      });

      setState({
        ...state,
        orders,
        shortOrders,
        closedOrders
      })
      
    }else{
      log('Sell order failed ',order);
    }
  }

  function log(...args){
    if(JSON.stringify(args).length<50){
      addToast(args);
    }
      
    console.log(args);
  }

  async function triggerNow(){
    let buyOrder = await triggerBuyOrder({
      actual:{
        close:state.closePrice
      }
    })

    if(buyOrder){
      let orders = [...state.orders];
      orders.push(buyOrder);
  
      setState({
        ...state,
        orders,
        hasOrdersUpdated:++state.hasOrdersUpdated
      })
    }

    
  }

  let totalProfit = 0;

  let orders = state.orders.map(order=>{
    let buyPrice = (order.average_price||order.price)
    order.profit = (state.closePrice - buyPrice) * order.quantity;
    totalProfit += order.profit;
    order.profitPct = (state.closePrice - buyPrice) * 100/buyPrice;
    return order;
  });

  let shortOrders = state.shortOrders.map(order=>{
    let sellPrice = (order.average_price||order.price)

    order.profit = (sellPrice - state.closePrice ) * order.quantity;
    totalProfit += order.profit;
    order.profitPct = (sellPrice - state.closePrice ) * 100/state.closePrice;
    return order;
  });

  return (
    <div >
      <Head>
        <title>
          {`${tradingsymbol} | ${totalProfit.toFixed(2)} | ${(config.shouldRun?'Running... ':'Stopped')}`}
        </title>
      </Head>
      {/* <button onClick={save}>Save</button> */}
      <Header userProfile={userProfile} tab="BuySell"></Header>


      <div className="container mt-5">

        <div className="columns is-gapless">

          <div className="column is-3">
            
            <BuySellConfig config={config} triggerNow={triggerNow} onUpdate={handleUpdate}></BuySellConfig>
             
          </div>

          <div className="column">
            <Table title={"Open Orders"} columns={orderColumns} data={orders}></Table>
            {state.shortOrders.length>0 &&
            <Table title={"Open Short Orders"} columns={orderColumns} data={shortOrders}></Table>
            }
            {state.closedOrders.length>0 &&
            <Table title={"Closed Orders"} columns={closedOrderColumns} data={state.closedOrders}></Table>
            }
          </div>
        </div>
      </div>

    
    </div>
  )
}

export async function getServerSideProps(ctx) {
  
  let {req,res} = ctx;
  let {tradingsymbol} = req.query;

  let kc,userProfile;
  try{
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  }catch(e){
    console.log(e)
    res.writeHead(307, { Location: `/`})
    res.end()
  }
  
  

  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();

  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];
  // console.log(123,session)

  userProfile.configs = session?.data.configs||dbUser.configs||{};
  userProfile.orders = session?.data.orders||[]
  userProfile.shortOrders = session?.data.shortOrders||[];
  userProfile.closedOrders = session?.data.closedOrders||[];
  

  return {
    props:{
      userProfile
    }
  }

}
