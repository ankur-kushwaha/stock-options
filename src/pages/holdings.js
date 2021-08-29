import React from 'react'
import { getKiteClient } from '../helpers/kiteConnect';
import getTicks from '../helpers/getTicks';

import Table from '../components/Table';
import Header from '../components/Header';
import Price from '../components/Price';

export default function Holdings({holdings,profile}) {
  let instruments = holdings.map(item=>item.instrument_token);
  let [marketDepth, setMarketDepth] = React.useState();

  React.useEffect(()=>{
    getTicks(instruments,function(ticks){
      setMarketDepth(ticks);
    });
  },[])

  
  if(marketDepth){
    for(let holding of holdings){
      
      holding.last_price = marketDepth[holding.instrument_token].last_price
      holding.day_change_percentage = marketDepth[holding.instrument_token].change
      

    }
  }


  let columns = [
    {
      name: 'tradingsymbol',
      selector: 'tradingsymbol',
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
    }].map(item=>{
    item.sortable =true;
    return item;
  })



  return (
    <>
      <Header profile = {profile}></Header>
      <div className="container">
        <Table data={holdings} columns ={columns}></Table>
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
