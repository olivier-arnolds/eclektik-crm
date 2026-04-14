export default function Btn({ children, primary, small, onClick }) {
  return <button onClick={onClick} style={{ padding:small?"3px 8px":"6px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:small?11:12, cursor:"pointer", background:primary?"#042C53":"#FFFFFF", color:primary?"#B5D4F4":"#2C2C2A", fontFamily:"inherit" }}>{children}</button>;
}
