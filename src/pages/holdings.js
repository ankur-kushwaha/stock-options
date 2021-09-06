import React from 'react'
import { getKiteClient } from '../helpers/kiteConnect';
import getTicks from '../helpers/getTicks';

import Table from '../components/Table';
import Header from '../components/Header';
import Price from '../components/Price';
import schedule from 'node-schedule';


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   


export default function Holdings({holdings,profile,quotes}) {

  let instruments = holdings.map(item=>item.instrument_token);
  let [marketDepth, setMarketDepth] = React.useState();
  let [history, setHistory] = React.useState({});
  let [filters,setFilters] = React.useState({});

  // console.log(holdings)
  async function getHistory(instruments){
    return fetch('/api/getHistory?instruments='+instruments.join(",")).then(res=>res.json());
  }

  React.useEffect(async ()=>{
    getTicks(instruments,function(ticks){
      setMarketDepth(ticks);
    });

    let historyData = await getHistory(holdings.map(item=>item.tradingsymbol));
    let out = historyData.data.reduce((a,b)=>{
      a[b.name]=b;
      return a;
    },{})
    console.log(out)
    setHistory(out);
    
  },[])

  if(marketDepth){
    for(let holding of holdings){

      holding.last_price = marketDepth[holding.instrument_token].last_price
      holding.day_change_percentage = marketDepth[holding.instrument_token].change

    }
  }

  let data = holdings.map(item=>{
    if(history){
      let itemHistory = history[item.tradingsymbol];
      if(itemHistory){
        item = {...item,...itemHistory,change:Number(itemHistory.change)}
      }
      
    }
    return item;
  })
    .filter(item=>{
      if(!filters.trend)
        return true 
      else 
        return item.trend==filters.trend
    })
    .sort((a,b)=>a.trendCount-b.trendCount)



  let columns = [
    {
      name: 'tradingsymbol',
      selector: 'tradingsymbol',
      cell:row=><a target="_blank" className="has-link-text" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.tradingsymbol}/${row.instrument_token}`} rel="noreferrer">{row.tradingsymbol}</a>
    },
    {
      name: 'trend',
      selector: 'trend',
    },
    {
      name: 'trendCount',
      selector: 'trendCount',
    },
    {
      name: 'Change',
      selector: 'change',
      cell:row=><Price>{row.change}</Price>
    },
    {
      name: 'quantity',
      selector: 'quantity',
    },
    
    {
      name: 'day_change_percentage',
      selector: 'day_change_percentage',
      cell:row=><Price>{row.day_change_percentage}</Price>
    },
    {
      name: 'average_price',
      selector: 'average_price',
      cell:row=><>{row.average_price.toFixed(2)}</>
    },
    {
      name: 'last_price',
      selector: 'last_price',
    },
    {
      name: 'pnl',
      selector: 'pnl',
      cell:row=><Price>{row.pnl}</Price>
    }]
    .map(item=>{
      item.sortable =true;
      return item;
    })

  const onChangeFilters=(key)=>(e)=>{
    console.log(key,e.target.value)
    setFilters({
      ...filters,
      [key]:e.target.value
    })
  }



  return (
    <>
      <Header profile = {profile}></Header>
      <div className="container mt-6">
        <div className="columns">
          <div className="column is-3">
            <div className="filter-item">
              <div className="is-size-7">
           Trend
              </div>
              <div className="select is-small">
                <select onChange={onChangeFilters('trend')}>
                  <option>Select</option>
                  <option>POSITIVE</option>
                  <option>NEGATIVE</option>
                </select>
              </div>
            </div>
          </div>
          <div className="column">
            <Table data={data} columns ={columns}></Table>
          </div>
        
        </div>
      </div>
      
      
        
      
    </>
  )
}

export async function getServerSideProps(ctx) {
  let { req } = ctx;
  let kt = await getKiteClient(req.cookies);
  let profile = await kt.getProfile();
  let holdings = await kt.getHoldings();
  
  return {
    props:{
      holdings,
      profile
    }
    
  }
}
