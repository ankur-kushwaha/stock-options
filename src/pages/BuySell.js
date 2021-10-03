import React from 'react'
import Header from '../components/Header';
import Price from '../components/Price';
import Table from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import { useRouter } from 'next/router'
import User from '../models/user'
import BuySellConfig from '../components/BuySellConfig';
import Head from 'next/head'
import { useToasts } from 'react-toast-notifications'
import fetch from '../helpers/fetch';
import useAutoTrade from '../helpers/useAutoTrade';

export default function BuySell({
  userProfile
}) {
  // const { addToast } = useToasts()

  let {query} = useRouter();
  let {tradingsymbol} = query;


  let defaultConfig = {
    ...userProfile.configs,
    tradingsymbol,
    maxOrder: userProfile.configs?.maxOrder || 5,
    minTarget:  userProfile.configs?.minTarget || 5,
    quantity : userProfile.configs?.quantity || 100,
    isBullish: (userProfile.configs?.isBullish == undefined)?true:!!userProfile.configs?.isBullish,
    marketOrder: !!userProfile.configs?.marketOrder,
    interval:userProfile.configs?.interval||'ONE_MINUTE'
  }
  const [config,setConfig] = React.useState(defaultConfig);
  const {orders, pendingOrders,closedOrders,
    closePrice,
    startAutoTrade,deleteOrder,
    updateOrder,
    importOpenOrders,
    save,
    triggerOrderNow,
    sellOrder,
    refreshPendingOrders,
    stopAutoTrade} = useAutoTrade(config,userProfile);




  React.useEffect(()=>{
    console.log(userProfile);

    fetch('/api/getQuote?instruments=NFO:'+tradingsymbol).then(res=>res.json()).then(res=>{
      let quote = res.quotes['NFO:'+tradingsymbol];
      if(!quote){
        console.log('Quote not available for ', tradingsymbol)
        return;
      }
      

      setConfig({
        ...config,
        instrumentToken:quote.instrument_token
      })

    });
    
  },[])

  // Trigger trading
  React.useEffect(()=>{ 

    if(config.shouldRun){
      startAutoTrade()
    }else{
      stopAutoTrade()
    }
      
  },[config.shouldRun])


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
    selector:'orderId',
    grow:1
  },{
    name:'quantity',
    selector:'quantity'
  },{
    name:'status',
    selector:'status'
  },{
    name:'buyPrice',
    selector:'buyPrice'
  },{
    name:'sellPrice',
    selector:'sellPrice'
  },{
    name:'profit',
    selector:'profit',
    cell:row=><div><Price>{row.profit}</Price><br/>
    (<Price>{row.profitPct}</Price>)
    </div>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={()=>deleteOrder(row,'closedOrders')}><span className="icon has-text-info">
      <i className="fas fa-times-circle"></i>
    </span></button>
  }]

  const BaseExpandedComponent = ({data})=><div className={"box"}>
    <span className="is-size-7">
      OrderID:{data.order_id}
    </span><br />
    <span className="is-size-7">
      Timestamp:{data.order_timestamp}
    </span>
    <br />
    <pre>{JSON.stringify(data)}</pre>
  </div>;

  let pendingOrderColumns = [{
    name:'Status',
    selector:'status'
  },{
    name:'Quantity',
    selector:'quantity'
  },{
    name:'Transaction',
    selector:'transactionType'
  },{
    name:'Buy Price',
    selector:'buyPrice',
    cell:row=><>{row.buyPrice}</>
  },{
    name:'LTP',
    selector:'LTP',
    cell:row=><>{closePrice}</>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={()=>deleteOrder(row,'pendingOrders')}>
      <span className="icon has-text-info">
        <i className="fas fa-times-circle"></i>
      </span></button>
  },{
    name:"Update Price",
    cell:row=><button className="button is-small" onClick={()=>updateOrder(row,'pendingOrders')}>
     Update</button>
  }]

  

  let orderColumns=[{
    name:'TradingSymbol',
    selector:'tradingsymbol',
    grow:2,
    wrap:false,
    cell:row=><a target="_blank" href={`https://kite.zerodha.com/chart/ext/ciq/NFO-OPT/${row.tradingsymbol}/${config.instrumentToken}` } rel="noreferrer">{row.tradingsymbol}</a>
  },{
    name:'Quantity',
    selector:'quantity'
  },{
    name:'Status',
    selector:'status'
  },{
    name:'Buy Price',
    selector:'buyPrice',
  },{
    name:'LTP',
    selector:'price',
    cell:()=><>{closePrice}</>
  },{
    name:'PnL',
    selector:'pnl',
    cell:(row)=>
      <div>
        <Price>{(closePrice - row.buyPrice)*row.quantity}</Price><br/> (<Price>{(closePrice - row.buyPrice)/row.buyPrice*100}</Price>)
      </div>
  },{
    name:"Buy/Sell",
    cell:row=><button className="button is-small" onClick={()=>sellOrder(row)}>Sell</button>
  },{
    name:"Delete",
    cell:row=><button className="button is-small" onClick={()=>deleteOrder(row,'orders')}>
      <span className="icon has-text-info">
        <i className="fas fa-times-circle"></i>
      </span></button>
  }];


  let totalProfit = 0;






  return (
    <div >

      <Head>
        <title>
          {`${totalProfit.toFixed(2)} | ${tradingsymbol} | ${(config.shouldRun?'Running... ':'Stopped')}`}
        </title>
      </Head>
      {/* <button onClick={save}>Save</button> */}
      <Header userProfile={userProfile} tab="BuySell"></Header>

      <div className="container mt-5">

        <div className="columns is-gapless">

          <div className="column is-3">
            
            <BuySellConfig importStock = {importOpenOrders} config={config} triggerNow={()=>triggerOrderNow()} onUpdate={handleUpdate}></BuySellConfig>
             
          </div>



          <div className="column">
            {pendingOrders.length>0 && <>
              <button className="button is-small" onClick={()=>refreshPendingOrders()}>
                Refersh Pending Orders
              </button>
              <Table 
                title={"Pending Orders"} 
                columns={pendingOrderColumns} 
                data={pendingOrders}
                expandableRows={true}
                ExpandedComponent={<BaseExpandedComponent/>}
              ></Table>
            </>}
            <Table 
              title={"Open Orders"} 
              columns={orderColumns} 
              data={orders}
              expandableRows={true}
              ExpandedComponent={<BaseExpandedComponent/>}
            ></Table>
            {closedOrders.length>0 &&
            <Table title={"Closed Orders"} columns={closedOrderColumns} data={closedOrders}></Table>
            }
          </div>
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
  
  

  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();

  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];

  userProfile.configs = session?.data.configs||dbUser.configs||{};
  userProfile.orders = session?.data.orders||[]
  userProfile.pendingOrders = session?.data.pendingOrders||[]
  userProfile.closedOrders = session?.data.closedOrders||[];
  

  return {
    props:{
      userProfile
    }
  }

}
