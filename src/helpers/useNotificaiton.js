import React from 'react'
var timediff = require('timediff');

export default function useNotifications(){
  
  let lastNotificaiton = React.useRef(new Date());
  React.useEffect(()=>{
    Notification.requestPermission().then(function(result) {
      console.log(result);
    });
  },[])
    
  function pushNotification({body}){
    let diff = timediff(lastNotificaiton.current,new Date(), 'm');
    if(diff.minutes >= 1){
      new Notification('Smart Options', { body });
      lastNotificaiton.current = new Date();
    }
  }

  return {
    pushNotification
  }
}
