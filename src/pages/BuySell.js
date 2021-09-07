import React from 'react'
import Header from '../components/Header';
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

  let orders = [],shortOrders=[];
  
  if(userProfile.orders){
    orders = userProfile.orders.filter(item=>item.tradingsymbol == tradingsymbol)
  }

  if(userProfile.shortOrders){
    shortOrders = userProfile.shortOrders.filter(item=>item.tradingsymbol == tradingsymbol)
  }
  
  let [state,setState] = React.useState({
    positions:[],
    hasOrdersUpdated:0,
    currTrend:"",
    profit:0,
    profitArr:[],
    tradeCount:0,
    orders: orders,
    shortOrders
  });

  React.useEffect(()=>{ 

    async function fetchHistory(){

      let regex = /NIFTY(.*)(\d{5})([C|P]E)/
    
      let map = {
        "21909":"09SEP21",
        "219016":"16SEP21",
        "219023":"23SEP21",
        "219030":"30SEP21"
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
    log("-----------------");
    
    if(history.length == 0){
      log('Returning as history length is 0');
      return ;
    }

    let item = history[history.length-1];
    log('history updated, last quote: ',item);

    let {tradeCount,profit} = state;
    let profitArr = [...state.profitArr];
    let orders = [...state.orders];
    let updatedShortOrders = [...state.shortOrders];

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
            if((item.close - order.average_price) > ((config.minTarget * order.average_price)/100)){
              log('Triggering Sell order for', order);
            
            
              hasOrdersUpdated++;
              executedOrders.push(order.order_id);
            
              let currOrder = await createOrder(item);

              let currProfit = currOrder.average_price - order.average_price;
              order.profit = currProfit;
              profit += currProfit;

              profitArr.push(currProfit);

            }else{
              log(`Sell order blocked due to either order already closed ${order.isClosed} or sell diff(${item.close - order.average_price}) bw itemClose(${item.close}) and orderClose(${order.average_price}) is less than ${config.minTarget}% of orderClose(${order.average_price}) i.e (${(config.minTarget * order.average_price)/100})`);
            }
          }
          //Remove executed orders
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
      shortOrders:newShortOrders||state.shortOrders
    };
    log('Saving user',data);
    await postData('/api/updateUser',data);
    
  },[config,state.orders,state.shortOrders])

  async function handleUpdate(config){
    setConfig(config);
    await save({newConfig:config});
  }

  let orderColumns=[{
    name:'tradingsymbol',
    selector:'tradingsymbol'
  },{
    name:'order_id',
    selector:'order_id'
  },{
    name:'status',
    selector:'status'
  },{
    name:'order_timestamp',
    selector:'order_timestamp'
  },{
    name:'order_type',
    selector:'order_type'
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'price',
    selector:'price',
    cell:(row)=><div>{state.closePrice}
      <br/>
      <div className="is-size-7">
        {((state.closePrice - row.average_price)* row.quantity).toFixed(2)} ({((state.closePrice - row.average_price)*100/row.average_price ).toFixed(2)}%)
      </div>
    </div>
  },{
    name:'average_price',
    selector:'average_price'
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

  return (
    <div >
      <Head>
        <title>
          {config.shouldRun?'Running...':'Stopped'}
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
            <Table title={"Orders(SmartOptions)"} columns={orderColumns} data={state.orders}></Table>
            <Table title={"Orders(SmartOptions)"} columns={orderColumns} data={state.shortOrders}></Table>
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

      

      {/* <div className="container mt-5">

        <div className="columns">
          <div className="column">
            <Table title={"Orders(Zerodha)"} columns={columns} data={state.positions}></Table>
          </div>
        </div>
      </div>  */}

     

     
      
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
  userProfile.configs = dbUser.configs;
  userProfile.orders = dbUser.orders;
  userProfile.shortOrders = dbUser.shortOrders;

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
