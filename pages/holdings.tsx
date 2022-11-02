import { GetServerSideProps } from 'next'
import React from 'react'
import PositionsTable from '../components/positions-table/positions-table'
import Cookies from 'cookies';
import { API_KEY, cookieName } from '../components/contants';
import { Card } from 'flowbite-react';
import HoldingsTable from '../components/holdings-table/holdings-table';

/* eslint-disable-next-line */
export interface HoldingsProps {
  holdings:any
}

export function Holdings({holdings}: HoldingsProps) {
  return (
    <div className="mt-4 mx-auto max-w-screen-xl	">
      <Card>
        <HoldingsTable holdings={holdings.sort((a:any,b:any)=>b.pnl-a.pnl)}/>
      </Card>
    </div>
  );
}


export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const cookies = new Cookies(req, res)
  const holdings = await fetch("https://api.kite.trade/portfolio/holdings", {
    headers: {
      Authorization: `token ${API_KEY}:${cookies.get(cookieName)}`,
      "X-Kite-Version": "3"
    }
  }).then(res=>res.json())



  return {
    props: {
      holdings:holdings.data
    }
  }
}

export default Holdings;
