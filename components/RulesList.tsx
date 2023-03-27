import { Button, Table } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { smartApi } from "../lib/smartConnect";
import { ReactTable } from "./ReactTable";



/* eslint-disable-next-line */
export interface PositionsTableProps {
  positions: any
}


export function RulesTable({  }: any) {

  const [rules,setRules] = useState([])
  useEffect(() => {
    smartApi('ruleList',{
      "status": ["NEW"],
      "page": 1,
      "count": 10
    }).then(res=>{
      setRules(res.data)
    })
  }, [])

  const netPositions = rules;

  const columns = React.useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'tradingsymbol', // accessor is the "key" in the data
      },
      {
        Header: 'Quantity',
        accessor: 'qty', // accessor is the "key" in the data
      },
      {
        Header: 'Trigger price',
        accessor: 'triggerprice', // accessor is the "key" in the data
      },
      {
        Header: 'Price',
        accessor: 'price', // accessor is the "key" in the data
      },
      {
        Header: 'Status',
        accessor: 'status', // accessor is the "key" in the data
      },
    ],
    []
  )
  
  return <>
    <ReactTable columns={columns} data={netPositions}></ReactTable>
  </>
}

export default RulesTable;
