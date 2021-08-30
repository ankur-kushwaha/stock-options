var timediff = require('timediff');

function validateUser(user){
  if(user.onTrial){
    let diff = timediff(new Date(), user.firstLogin, 'D');
    if(diff.days>30){
      return false;
    }
  }
  return true;
}


export {
  validateUser
}