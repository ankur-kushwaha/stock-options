var KiteConnect = require("kiteconnect").KiteConnect;
var KiteTicker = require("kiteconnect").KiteTicker;
var cookie = require("cookie");

let API_KEY = 'ab8oz67ryftv7gx9'

async function getKiteClient(cookiesRef) {
  let cookies;
  if(typeof cookiesRef == 'string'){
    cookies = cookie.parse(cookiesRef);   
  }else{ 
    cookies = cookiesRef
  }
  let accessToken = cookies["accessToken"]; 
  console.log("accesstoken",accessToken)

    
  var kc = new KiteConnect({
    api_key: API_KEY
  }); 

  kc.setAccessToken(accessToken);
  return kc;
}

async function getKiteTickerClient(cookiesRef) {
    
  let cookies;
  if(typeof cookiesRef == 'string'){
    cookies = cookie.parse(cookiesRef);   
  }else{
    cookies = cookiesRef
  }
    
  let accessToken = cookies["accessToken"]; 
  console.log('Creating ticker using token',accessToken);
  if(!accessToken){
    throw new Error("No accesstoken");
        
  }
    
  var kt = new KiteTicker({
    api_key:API_KEY,
    access_token:accessToken
  });
    
  return kt;
} 

module.exports = {
  getKiteClient,
  getKiteTickerClient
}
