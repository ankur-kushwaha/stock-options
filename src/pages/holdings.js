import { KiteConnect } from 'kiteconnect/lib';
import React from 'react'
import Header from '../components/Header';
import Table from '../components/Table';
import { getKiteClient } from '../helpers/kiteConnect';
import getTicks from '../helpers/getTicks';

export default function Holdings({holdings}) {
  let instruments = holdings.map(item=>item.instrument_token);

  React.useEffect(()=>{
    getTicks(instruments,function(ticks){
      console.log(ticks)
    });
  },[])
  

  console.log('ticks',holdings);

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
    },
    {
      name: 'last_price',
      selector: 'last_price',
    },
    {
      name: 'pnl',
      selector: 'pnl',
    }].map(item=>{
    item.sortable =true;
    return item;
  })



  return (
    <div>

      <Header></Header>
      <Table data={holdings} columns ={columns}>

      </Table>
    </div>
  )
}

export async function getServerSideProps(ctx) {
  let { req } = ctx;
  let kt = await getKiteClient(req.cookies);
  let holdings = await kt.getHoldings();
  return {
    props:{
      holdings
    }
    
  }
}
