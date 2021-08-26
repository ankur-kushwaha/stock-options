import useTicker from '../helpers/useTicker';

export default function Test(){
  let {ticks}  = useTicker([31512322])
console.log(ticks);
  return <h1>Socket.io </h1>
}