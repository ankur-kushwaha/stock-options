import React,{useState} from 'react'
import Header from '../components/Header';
import Head from 'next/head'
import Table, { Column } from '../components/Table';
import useConfig from '../helpers/useConfig'
import BuySellConfig from '../components/BuySellConfig';
import dbConnect from '../middleware/mongodb'
import { getKiteClient, kiteConnect } from '../helpers/kiteConnect';
import User from '../models/user'
import useOptionTrader from '../helpers/useOptionTrader';
import useZerodha from '../helpers/useZerodha';
import { LineChart, Line, XAxis, Tooltip, Legend } from 'recharts';


export default function OptionSeller({
  userProfile,
  config:defaultConfig
}) {

  let [quotes,setQuotes] = React.useState([]);

  const fetchQuotes = React.useCallback(async ()=>{
    let instrument = 'NFO:'+defaultConfig.tradingsymbol;
    let instruments = [instrument]
    let res = await kiteConnect('getQuote',instruments);
    let data = res[instrument];

    setQuotes([...quotes,{
      buy:data.depth.buy[0].price,
      sell:data.depth.sell[0].price        
    }]);

  },[quotes])

  React.useEffect(() => {
    let interval
    interval = setTimeout(fetchQuotes,5000)
    return () => {
      clearInterval(interval);
    }
  }, [fetchQuotes])

  return (
    <div >

      <Head>
        <title>
          Option Seller
        </title>
      </Head>
      <Header userProfile={userProfile} tab="BuySell"></Header>

      <div className="container mt-5">
        <div className="columns is-gapless">
          <LineChart width={800} height={400} data={quotes}>
            <Line type="monotone" dataKey="buy" stroke="green" />
            <Line type="monotone" dataKey="sell" stroke="red" />
            <XAxis dataKey="timestamp" />
            <Tooltip />
            <Legend />
          </LineChart>
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
  await dbConnect();
  let dbUser = (await User.findOne({user_id:userProfile.user_id})).toObject();
  let session = dbUser.sessions.filter(item=>item.tradingsymbol == tradingsymbol)[0];
  
  return {
    props:{
      userProfile,
      config:session?.data?.configs||{
        tradingsymbol
      }
    }
  }
}