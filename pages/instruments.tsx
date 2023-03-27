import { Button } from 'flowbite-react';
import { GetServerSideProps } from 'next'
import React, { useEffect, useState } from 'react'
import { ReactTable } from '../components/ReactTable';
import { db, Instrument } from '../lib/db';

export default function Instruments({ positions }: any) {

  const [filteredInstruments,setInstruments] = useState<Instrument[]>([]);

  async function loadInstruments() {
    console.log('cleaning...');
    
    await cleanDb()
    console.log('fetching...');
    await fetch('https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json')
      .then(res => res.json())
      .then(async res => {
        console.log('Saving...');
        const id = await db.instruments.bulkAdd(res);
      }).catch(e=>{
        console.error(e);
      })
      console.log('Done');
  }

  async function queryInstrument() {
    let currentPrice = 1800;
    let targetStrPrice= currentPrice - 10*currentPrice/100;
    const someFriends = await db.instruments
      .where("name").equals('ADANIENT')
      .and(instrument=>instrument.exch_seg=='NFO' && instrument.symbol.endsWith('PE') && (Number(instrument.strike)/100) < targetStrPrice)
      .toArray();

    // console.log(someFriends.map(item=>({...item,strike:(Number(item.strike)/100)})));
    let data= someFriends
    console.log(data);
    
    setInstruments(data)

  }

  async function cleanDb() {
    let res = await db.instruments.where("name").notEqual('abc').delete()
    console.log(res);
  }

  async function getAllStocks(){
    const stocks = await db.instruments
      .where("exch_seg").equals('NSE')
      .and(item=>item.name+"-EQ" == item.symbol)
      .toArray();
    console.table(stocks);
    
      
  }


  const columns = React.useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'symbol', // accessor is the "key" in the data
      },
      {
        Header: 'Expiry',
        accessor: 'expiry', // accessor is the "key" in the data
      },
      {
        Header: 'lotsize',
        accessor: 'lotsize', // accessor is the "key" in the data
      },
      {
        Header: 'Stock',
        accessor: 'name', // accessor is the "key" in the data
      },
      {
        Header: 'strike',
        accessor: 'strike', // accessor is the "key" in the data
      },
    ],
    []
  )


  return <>
    <Button onClick={getAllStocks}>Get all</Button>
    <Button onClick={loadInstruments}>Load all</Button>
    <Button onClick={queryInstrument}>Query DB</Button>
    <ReactTable columns={columns} data={filteredInstruments}></ReactTable>

  </>
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {

  return {
    props: {

    }
  }
}