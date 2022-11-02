import { Button, Card, Checkbox, Label, ListGroup, TextInput } from 'flowbite-react'
import React from 'react'
import { AppContext } from '../lib/AppContext'
import { BsXCircleFill } from 'react-icons/bs'

export default function InstrumentSidebar() {

  const { selectedInstruments, setSelectedInstruments, config, setConfig } = React.useContext(AppContext);
  const [watchList, setWatchList] = React.useState([{
    stockCode: "NIFTY 50"
  }, {
    stockCode: "NIFTY BANK"
  }]);

  React.useEffect(() => {
    setSelectedInstruments({
      "NIFTY 50": true,
      "NIFTY BANK": true
    })
  }, [])

  const handleChange = (stockCode) => (e) => {
    setSelectedInstruments({
      ...selectedInstruments,
      [stockCode]: e.target.checked
    })
  }

  const setConfigValue = (configName, checked = true) => (e) => {
    setConfig({
      ...config,
      [configName]: checked ? e.target.checked : e.target.value
    })
  }

  const handleMinStrikeChange = (e) => {
    setConfig({
      ...config,
      minStrike: e.target.value
    })
  }

  return (
    <div className='w-full'>
      <Card>
        <div>
          <ListGroup>
            {watchList.map(instrument => {
              return (
                <ListGroup.Item key={instrument.stockCode}>
                  <div className="flex flex-row justify-between items-center w-full">
                    <div>
                      <Checkbox
                        onClick={handleChange(instrument.stockCode)}
                        id={instrument.stockCode}
                        checked={selectedInstruments[instrument.stockCode]}
                      />
                      <span className='ml-2'>

                        <Label htmlFor={instrument.stockCode}>
                          {instrument.stockCode}
                        </Label>
                      </span>

                    </div>

                  </div>

                </ListGroup.Item>

              )
            })}
          </ListGroup>
        </div>

        <div
          className="flex flex-col gap-1"
        >
          <div>
            <div className="mb-2 block">
              <Label
                htmlFor="minStrike"
                value="Min Strike"
              />
            </div>
            <TextInput
              value={config.minStrike}
              id="minStrike"
              type="number"
              onChange={handleMinStrikeChange}
            />
          </div>
          <div>
            <div className="mb-2 block">
              <Label
                htmlFor="minTimeValue"
                value="Min timevalue"
              />
            </div>
            <TextInput
              value={config.minTimeValue}
              id="minTimeValue"
              type="number"
              onChange={setConfigValue('minTimeValue', false)}
            />
          </div>


        </div>
      </Card>
    </div>
  )
}
