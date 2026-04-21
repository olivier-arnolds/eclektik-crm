import { fmtMoney } from './atoms';

export default function Statusbar({ unreadCount = 0, openDeals = 0, totalValue = 0, userName = '' }) {
  return (
    <div className="statusbar">
      <span>Eclectik BD</span>
      <span className="sep">·</span>
      <span>{userName}</span>
      <span className="sep">·</span>
      <span>{unreadCount} unread</span>
      <span className="sep">·</span>
      <span>{openDeals} open · {fmtMoney(totalValue)}</span>
    </div>
  );
}
