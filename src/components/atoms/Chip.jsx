export default function Chip({ children, bg="#F1EFE8", color="#5F5E5A", size=11 }) {
  return <span style={{ display:"inline-flex", alignItems:"center", fontSize:size, padding:"2px 8px", borderRadius:10, border:"0.5px solid #D3D1C7", background:bg, color, whiteSpace:"nowrap" }}>{children}</span>;
}
