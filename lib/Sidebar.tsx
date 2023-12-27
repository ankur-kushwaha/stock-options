
import { Sidebar, TextInput } from 'flowbite-react';
import { HiChartPie } from 'react-icons/hi';

export function SidebarComponent(props: {
  stocks: { stockCode: string; ex: string; }[]; setStocks: React.Dispatch<React.SetStateAction<{
    stockCode: string;
    ex: string;
  }[]>>;
}) {

  function handleChange(e:any) {
    if (e.keyCode === 13) {
      let stocks = JSON.parse(window.localStorage.getItem('stocks') || '[]');
      let newStock = {
        stockCode: e.target.value,
        ex: 'NSE'
      }
      stocks.push(newStock)
      window.localStorage.setItem('stocks', JSON.stringify(stocks));
      props.setStocks(stocks);
      e.target.value = '';
    }
  }

  function deleteItem(item:any){
    let stocks = JSON.parse(window.localStorage.getItem('stocks') || '[]');
    stocks.splice(item, 1);
    window.localStorage.setItem('stocks', JSON.stringify(stocks));
    props.setStocks(stocks);
  }

  return (
    <Sidebar aria-label="Default sidebar example">
      <Sidebar.Items>
        <Sidebar.ItemGroup>

          {props.stocks.map(stock => {
            return <Sidebar.Item href="#" icon={HiChartPie} >
              <div className='flex justify-between'>
              {stock.stockCode}
              <button className='text-red-900' onClick={()=>deleteItem(stock)}>X</button>
              </div>
              
            </Sidebar.Item>
          })}

          <TextInput id="email1" type="email" placeholder="Add stock" required onKeyUp={handleChange} />

        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}