import React, { useEffect, useState } from "react";
import { ReactTable } from "../ReactTable";

export interface HoldingsTableProps {
  holdings: any;
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  
  const [data, setData] = useState([]);
  useEffect(() => {
    setData(holdings)
  }, [])

  const columns = React.useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'tradingsymbol', // accessor is the "key" in the data
      },
      {
        Header: 'Quantity',
        accessor: 'quantity', // accessor is the "key" in the data
      },
      {
        Header: 'Avg Price',
        accessor: 'average_price', // accessor is the "key" in the data
      },
      {
        Header: 'Price',
        accessor: 'last_price', // accessor is the "key" in the data
      },
      {
        Header: 'PnL',
        accessor: 'pnl', // accessor is the "key" in the data
      }
    ],
    []
  )

  return <ReactTable columns={columns} data={data}></ReactTable>
}

export default HoldingsTable;
