import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import Table from '../components/Table';
import { fetchOptions } from '../helpers/dbHelper';
import { getKiteClient } from '../helpers/kiteConnect';
import Price from '../components/Price'
import useZerodha from '../helpers/useZerodha';
import { useRouter } from 'next/router'
import useNotifications from '../helpers/useNotificaiton';
import date from 'date-and-time';


export default function options2({
  options,
  profile,
  stockQuote,
  optionQuotes
}) {

  const [state, setState] = React.useState({})

  React.useEffect(async () => {
    let res = await fetch('/api/multiOptions').then(res => res.json());
    setState({
      options: res.out
    })

  }, [])

  let columns = [
    {
      name: 'stock',
      selector: 'stock',
      cell:row=><a target="_blank" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.stock}/${row.instrumentToken}`} rel="noreferrer">{row.stock}</a>
    },
    {
      name: 'stockPrice',
      selector: 'stockPrice',
    },
    {
      name: 'signal',
      selector: 'signal',
    },{
      name: 'lastReverse',
      selector: 'lastReverse',
    }, {
      name: 'lastChange',
      selector: 'lastChange',
      cell:row=><Price>{row.lastChange}</Price>
    }, {
      name: '5Days Change',
      selector: 'day5Change',
      cell:row=><Price>{row.day5Change}</Price>
    }, {
      name: '10Days Change',
      selector: 'day10Change',
      cell:row=><Price>{row.day10Change}</Price>
    }].map(item => {
    item.sortable = true;
    return item;
  });

  let optionsData = state.options

  return <>
    <div>

      <Header userProfile={profile} />

      <div className="mt-6 container">
        <div className="columns">
          <div className="column">
            <Table columns={columns} data={optionsData} />
          </div>
        </div>


      </div>
    </div>
  </>
}

export async function getServerSideProps(ctx) {
  let { req } = ctx;

  let kc = await getKiteClient(req.cookies);





  let profile = await kc.getProfile();


  return {
    props: {


      profile,

    }
  }
}
