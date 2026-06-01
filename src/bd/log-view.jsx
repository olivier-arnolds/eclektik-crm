// Log / version-history view. Renders the changelog (src/bd/changelog.js) as a
// timeline so the team can see, inside the app, exactly what changed and when —
// plus how to roll back to any previous version via git.
import { useState } from 'react';
import { CHANGELOG, CURRENT_VERSION } from './changelog';

const TYPE_HUE = { feature: 150, fix: 40, refactor: 260, chore: 220, breaking: 0 };

function stamp(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { local: iso, utc: '' };
  const local = d.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const utc = d.toLocaleString('en-GB', {
    timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' UTC';
  return { local, utc };
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn-ghost tiny"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }
        catch { /* clipboard blocked — user can select manually */ }
      }}
      title="Copy command"
      style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
    >
      {done ? '✓ copied' : 'copy'}
    </button>
  );
}

export default function LogView() {
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 28px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-1)' }}>Change Log</h1>
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4,
          background: 'var(--accent-tint)', color: 'var(--accent)', letterSpacing: '0.04em',
        }}>
          current · v{CURRENT_VERSION}
        </span>
      </div>

      <p style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.6, marginTop: 8, marginBottom: 24 }}>
        Every change to this app is recorded below — newest first — with a date-time stamp and
        the exact detail of what was done. Each version maps to a git tag, so any version can be
        restored. To roll back, run the command shown on that version (or ask Claude to do it).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {CHANGELOG.map((e) => {
          const { local, utc } = stamp(e.date);
          const hue = TYPE_HUE[e.type] ?? 220;
          return (
            <div key={e.version} style={{
              border: '0.5px solid var(--sep)', borderRadius: 8, background: 'var(--bg-1)',
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                  padding: '3px 9px', borderRadius: 5,
                  background: `oklch(92% 0.06 ${hue})`, color: `oklch(35% 0.12 ${hue})`,
                }}>
                  v{e.version}
                </span>
                {e.type && (
                  <span style={{
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: 'var(--font-mono)', color: `oklch(45% 0.12 ${hue})`,
                  }}>{e.type}</span>
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>{e.title}</span>
              </div>

              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {local}{utc ? ` · ${utc}` : ''}{e.author ? ` · ${e.author}` : ''}
              </div>

              {e.summary && (
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
                  {e.summary}
                </p>
              )}

              {Array.isArray(e.changes) && e.changes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>
                    What changed
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-2)' }}>
                    {e.changes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray(e.files) && e.files.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>
                    Files
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {e.files.map((f, i) => (
                      <span key={i} style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 7px',
                        borderRadius: 4, background: 'var(--fill-2)', color: 'var(--text-2)',
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {e.rollback && (
                <div style={{
                  marginTop: 12, padding: '8px 10px', borderRadius: 6,
                  background: 'var(--fill-2)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-2)',
                }}>
                  <strong style={{ color: 'var(--text-1)' }}>Rollback:</strong> {e.rollback}
                </div>
              )}

              {e.gitTag && (
                <div style={{
                  marginTop: 14, paddingTop: 12, borderTop: '0.5px dashed var(--sep)',
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Roll back to this version:</span>
                  <code style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '3px 8px',
                    borderRadius: 4, background: 'var(--fill-2)', color: 'var(--text-1)',
                  }}>
                    git checkout {e.gitTag}
                  </code>
                  <CopyButton text={`git checkout ${e.gitTag}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1.6, marginTop: 24 }}>
        Tip: <code style={{ fontFamily: 'var(--font-mono)' }}>git checkout {'<tag>'}</code> shows you an older version without losing anything;
        <code style={{ fontFamily: 'var(--font-mono)' }}> git checkout main</code> returns you to the latest.
        To permanently undo a version on the live site, use <code style={{ fontFamily: 'var(--font-mono)' }}>git revert</code> and push.
      </p>
    </div>
  );
}
