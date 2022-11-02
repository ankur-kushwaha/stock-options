import { GetServerSideProps } from 'next'
import React from 'react'
import PositionsTable from '../components/positions-table/positions-table'
import Cookies from 'cookies';
import { API_KEY, cookieName } from '../components/contants';
import { Card } from 'flowbite-react';

export default function positions({ positions }:any) {
  
  return (
    <div className="mt-4 mx-auto max-w-screen-xl	">
      <Card>
      <PositionsTable positions={positions}></PositionsTable>  
      </Card>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const cookies = new Cookies(req, res)
  const positions = await fetch("https://api.kite.trade/portfolio/positions", {
    headers: {
      Authorization: `token ${API_KEY}:${cookies.get(cookieName)}`,
      "X-Kite-Version": "3"
    }
  }).then(res=>res.json())

  console.log({ positions });

  return {
    props: {
      positions
    }
  }
}