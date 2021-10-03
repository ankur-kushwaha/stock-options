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
import useSellTrade from '../helpers/useSellTrade';

export default function BuySell({
  userProfile
}) {


  // const { addToast } = useToasts()

  let {query} = useRouter();
  let {tradingsymbol} = query;


  let defaultConfig = {
    tradingsymbol,
    maxOrder: userProfile.configs?.maxOrder || 5,
    minTarget:  userProfile.configs?.minTarget || 5,
    quantity : userProfile.configs?.quantity || 100,
    isBullish: (userProfile.configs?.isBullish == undefined)?true:!!userProfile.configs?.isBullish,
    marketOrder: !!userProfile.configs?.marketOrder,
    interval:userProfile.configs?.interval||'ONE_MINUTE',
    instrumentToken:undefined
  }
  const [config,setConfig] = React.useState({
    ...defaultConfig,
    shouldRun:false
  });
  const {
    orders, 
    pendingOrders,
    closedOrders,
    closePrice,
    startAutoTrade,
    save,
    triggerOrderNow,
    stopAutoTrade,
    deleteOrder,
    // updateOrder,
    importOpenOrders,
    sellOrder,
    // refreshPendingOrders,
  } = useSellTrade(config,userProfile);

  function shorten(num){
    return Number(num.toFixed(2))
  }

  let openOrders = orders.map(item=>{
    let buyPrice = item.buyOrder?.price;
    let sellPrice = item.sellOrder?.price;
    let quantity = item.buyOrder?.quantity||item.sellOrder?.quantity;
    return{
      status:item.status,
      tradingsymbol:item.tradingsymbol,
      quantity,
      buyStatus:item.buyOrder?.status,
      sellStatus:item.sellOrder?.status,
      buyPrice,
      sellPrice,
      closePrice,
      profit:shorten((sellPrice-(buyPrice||closePrice))*quantity)
    }
  })


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
    console.log(userProfile)
    if(config.shouldRun){
      startAutoTrade()
    }else{
      stopAutoTrade()
    }
      
  },[config.shouldRun])


  async function handleUpdate(config){
    setConfig(config);
    // await save({configs:config});
  }

  
  const BaseExpandedComponent = ({data}:{data?:any})=>{

    let fields = [{
      key:'buyPrice'
    },{
      key:'sellPrice'
    },{
      key:'buyStatus'
    },{
      key:'sellStatus'
    }]

    return <div className={"box"}>

      {fields.map(item=> <><span className="is-size-7">
        {item.key}:{data[item.key]}
      </span><br /></>)}
  
      <pre>{JSON.stringify(data,null,2)}</pre>
    </div>
  }

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
    selector:'status',
  },{
    name:'LTP',
    selector:'closePrice',
  },{
    name:'Profit',
    selector:'profit',
  },{
    name:"Buy/Sell",
    cell:row=><><button className="button is-small" onClick={()=>sellOrder(row)}>Sell</button>
      <button className="button is-small" onClick={()=>deleteOrder(row,'orders')}>
        <span className="icon has-text-info">
          <i className="fas fa-times-circle"></i>
        </span></button></>
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
            ClosePrice:{closePrice}
            {pendingOrders.length>0 && <>
              <button className="button is-small">
                Refersh Pending Orders
              </button>
              {/* <Table 
                title={"Pending Orders"} 
                columns={pendingOrderColumns} 
                data={pendingOrders}
                expandableRows={true}
                ExpandedComponent={<BaseExpandedComponent/>}
              ></Table> */}
            </>}
            <Table 
              title={"Open Orders"} 
              columns={orderColumns} 
              data={openOrders}
              expandableRows={true}
              ExpandedComponent={<BaseExpandedComponent/>}
            ></Table>
            
           
          </div>
        </div>
      </div>

    
    </div>
  )
}

export async function getServerSideProps(ctx) {
  
  let {req,res,query} = ctx;
  // console.log(req)
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
  

  

  return {
    props:{
      userProfile
    }
  }

}
