import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
// import getTicks from '../helpers/getTicks';
import { getKiteClient } from '../helpers/kiteConnect';
import Price from '../components/Price'
import useZerodha from '../helpers/useZerodha';
import useNotifications from '../helpers/useNotificaiton';
import date from 'date-and-time';
import { useRouter } from 'next/router'


type Option={
  instrument_token:string,
  strike:number
}

export default function options2({
  options,
  profile,
  stockQuote,
  type,
  optionQuotes
}) {


  const router = useRouter()
  let {query}  = router;
  let {expiry} = query;

  React.useEffect(()=>{
    console.log(optionQuotes)
  },[])

  const [state,setState ] = React.useState({
    expiry:"",
    leg1:null,
    leg2:null
  });

  const selectLegs = (row)=>(e)=>{
    let {leg1,leg2 } = state;
    if(e.target.checked){
      if(leg1){
        leg2= row;
      }else{
        leg1=row;
      }
    }else{
      if(leg1?.strike == row.strike){
        leg1= null;
      }else{
        leg2 = null
      }
    }
    
    setState({
      ...state,
      leg1,
      leg2
    })
  }

  let columns = [
    {
      name: 'Select',   
      selector: 'tradingsymbol', 
      sortable:true,
      cell:row=><><input checked={state.leg1?.strike==row.strike||state.leg2?.strike==row.strike} onChange={selectLegs(row)} type="checkbox"></input>{row.tradingsymbol}</>
    },
    {
      name: 'expiry',   
      selector: 'expiry', 
      sortable:true
    },
    {
      name: 'strike',   
      selector: 'strike',    
    },
    {
      name: 'price',   
      selector: 'price',    
    },
    {
      name: 'breakeven',   
      selector: 'breakeven',    
      cell:row=><div>
        {row.breakeven}<br/>
        (<Price threshold={0.7} reverseColoring>{row.beChg}</Price>)
      </div>
      
    },{
      name: 'TimeValue',   
      selector: 'minInvestment',   
      cell:row=><Price>{row.minInvestment}</Price> 
    }
  ].map(item=>{
    item.sortable = true;
    return item;
  });

  let expiries = new Set<string>();

  let optionsData = Object.values(optionQuotes).map((quote:any)=>{
    let price = ((quote.depth.sell[0].price)+quote.depth.buy[0].price)/2
    let stockPrice = stockQuote.last_price
    
    let option = options[quote.instrument_token]
    
    expiries.add(option.expiry);

    let breakeven = option.strike+price;
    if(type=='PE'){
      breakeven = option.strike - price;
    }
    let beChg =(breakeven-stockPrice)/stockPrice*100;

    let minInvestment = price * option.lot_size;
    let today:any = new Date();
    let expiryDate  = date.parse(option.expiry,'YYYY-MM-DD') //2025-12-24',

    
    let daysDiff = Math.ceil((expiryDate-today) / (1000 * 60 * 60 * 24)) 
    let buySellDiff = 0;//((quote.depth.sell[0].price) - quote.depth.buy[0].price)/quote.depth.buy[0].price

    let intrinsicValue = Math.max(stockPrice-option.strike,0);
    let intrinsicValueAmt = intrinsicValue * option.lot_size;
    let intrinsicValuePct = intrinsicValue/price*100;
    let timeValue  = (breakeven-stockPrice)*option.lot_size;
    let timeValue2  = (breakeven-stockPrice)/price*100;

    if(type=='PE'){
      timeValue = Math.min(price,(price - (option.strike - stockPrice)))* option.lot_size;
      timeValue2 = (price - (option.strike - stockPrice))/price*100
      minInvestment = timeValue
    }

    let futurePrice = price - ((timeValue*price/daysDiff)/100) + (stockPrice*0.01);
    let roi = (futurePrice - price) / price * 100;

    
    
    return {
      ...quote,
      ...option,
      buySellDiff,
      price,
      beChg,
      lotSize:option.lot_size,
      timeValue,
      intrinsicValueAmt,
      intrinsicValuePct,
      timeValue2,
      futurePrice,
      roi,
      minInvestment,
      daysDiff,
      breakeven
    }
  })
    .filter(item=>{
      let cond =  item.price
      && item.daysDiff < 60 
      && item.daysDiff>0
      && item.buySellDiff < 0.1
    
      if(query.expiry.length>0){
        cond = cond && item.expiry == query.expiry
      }
      return cond;

    }).sort((a,b)=>-a.minInvestment+b.minInvestment);

  const handleChange = (key)=>(e)=>{
    if(key=='expiry'){
      router.push({
        pathname: '',
        query: { ...query,expiry:e.target.value },
      })
    }
    setState({
      ...state,
      [key]:e.target.value
    })
  }

  return <>
    <div>
      
      <Header userProfile={profile}/>
      
      <div className="mt-6 container">

        <div className="columns">
          <div className="column is-3">

            <div className="box">
              <div className="is-size-7">
  Stock Price: {stockQuote?.last_price}
              </div>
              <hr />

              <div className="is-size-7">
    Expiry
              </div>
              <div className="select is-fullwidth is-small mb-3">
                <select value={query.expiry} onChange={handleChange('expiry')}>
                  <option value="">Select Expiry</option>
                  {Array.from(expiries).map(item=><option key={item}>{item}</option>)}
                </select>
              </div>
            </div> 
          </div>
          <div className="column">

            <div className="box">
              <div className="is-size-7">
              Leg1: {state.leg1?.strike},{state.leg1?.minInvestment}
              </div>
              <hr />
              <div className="is-size-7">
              Leg2: {state.leg2?.strike},{state.leg2?.minInvestment}
              </div>
              <hr />
              <div className="is-size-7">
              Diff: <Price>{Math.abs(state.leg2?.minInvestment - state.leg1?.minInvestment )}</Price>
              </div>

            </div>           

          </div>
        </div>
        
        <div className="columns">
          
          

          <div className="column">
            <Table columns={columns} data={optionsData}/>
          </div>
          <div className="column">
            <Table columns={columns} data={optionsData.reverse()}/>
          </div>
        </div>


      </div>
    </div>
  </>
}

export async function getServerSideProps(ctx){
  let {req,query} = ctx;
  let {tradingsymbol,range=10,type='CE'} = query; // INFY
  let kc = await getKiteClient(req.cookies);
  
  let stockCodeId = `NSE:${tradingsymbol}`
  if(tradingsymbol == 'NIFTY'){
    stockCodeId = 'NSE:NIFTY 50'
  }
  let quotes = await kc.getQuote([stockCodeId]);
  let stockQuote = quotes[stockCodeId];

  let profile = await kc.getProfile();

  let options:Option[] = await fetchOptions({
    tradingsymbol:tradingsymbol,
    instrumentType:type
  });

  // console.log(options)
  let stockPrice = stockQuote.last_price;
  // console.log('stockPrice',stockPrice)
  let upperRange = stockPrice + (stockPrice*range/100)
  let lowerRange = stockPrice - (stockPrice*range/100)

  for(let option of Object.values(options)){
    
    if( option.strike < lowerRange || option.strike > upperRange){
      delete options[option.instrument_token];
    }
  }

  console.log(Object.values(options).map(option=>option.strike));

  let optionQuotes = await kc.getQuote(Object.values(options).map(item=>item.instrument_token));

  for(let stockCode in quotes){
    let quote = quotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;

    // let code = stockCode.split(":")[1]
    // stockQuotes[code]=quote;
  }
  for(let stockCode in optionQuotes){
    let quote = optionQuotes[stockCode];
    delete quote.timestamp;
    delete quote.last_trade_time;
  }

  return {
    props:{
      type,
      stockQuote,
      options,
      profile,
      optionQuotes
    }
  }
}
