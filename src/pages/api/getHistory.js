let { SmartAPI } = require("smartapi-javascript");
const InstrumentHistory = require('../../models/InstrumentHistory');
import date from 'date-and-time';
import dbConnect from '../../middleware/mongodb'
import { getHistory } from './updateHistory';


let smart_api = new SmartAPI({
  api_key: "bMhFOYF3",    // PROVIDE YOUR API KEY HERE
  // OPTIONAL : If user has valid access token and refresh token then it can be directly passed to the constructor. 
  access_token: "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6IkE2MzE0NDkiLCJyb2xlcyI6MCwidXNlcnR5cGUiOiJVU0VSIiwiaWF0IjoxNjMwNTk5NDcwLCJleHAiOjE3MTY5OTk0NzB9.rUqZRJPamffC6lnhbnDamhcOBIIuipvDr0c2Talrk8_MZZX-r2nk4UJ6m9X-rIKupRhPPzjcHjv5TWKp2xMCEg",
  refresh_token: "eyJhbGciOiJIUzUxMiJ9.eyJ0b2tlbiI6IlJFRlJFU0gtVE9LRU4iLCJpYXQiOjE2MzA1OTk0NzB9.vLt-o0u0cf-5LY2oxIGRjNlatqiSbzsRjA1Qtn5TVHorTDMRv_rtQOcCxH493Wvv8ZNQ8OgXqV1PUWkKoas0sw"
});


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

export default async function handler(req, res) {
  await dbConnect()
  await smart_api.generateSession("A631449", "Kushwaha1@")
  let profile = await smart_api.getProfile();
  console.log(profile);
  let instruments = req.query.instruments.split(",").filter(item=>item.indexOf('BE')==-1)

  let today = date.format(new Date(),'YYYY-MM-DD') //2021-09-27"

  let history = {},noData=[];
  for(let instrument of instruments){
    let data = await InstrumentHistory.find({name:instrument,date:today}).exec();
    if(data){
      // console.log(data);
      noData.push(instrument)
      history[instrument] = await getHistory({
        instrument,
        exchange:'NSE'
      });
    }else{
      history[instrument] = data;
    }

  }

  


  res.status(200).json({history,noData})
    
}
