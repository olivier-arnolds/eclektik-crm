import { useState, useRef, useEffect } from "react";

export default function EditableField({ value, field, table, rowId, type = "text", options, refetch, updateRow, displayValue, suffix = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // For multiselect: parse comma-separated string into array
  const parseMulti = (v) => (v || "").split(",").map(s => s.trim()).filter(Boolean);
  const [multiDraft, setMultiDraft] = useState(() => parseMulti(value));

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text" || type === "number") inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value ?? "");
    if (type === "multiselect") setMultiDraft(parseMulti(value));
  }, [value]);

  // Close multiselect on outside click
  useEffect(() => {
    if (!editing || type !== "multiselect") return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        saveMulti();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, multiDraft]);

  const save = async () => {
    setEditing(false);
    let parsed = draft;
    if (type === "number") parsed = Number(draft) || 0;
    if (parsed === value) return;
    await updateRow(table, rowId, { [field]: parsed });
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 1000);
  };

  const saveMulti = async () => {
    setEditing(false);
    const joined = multiDraft.join(", ");
    if (joined === (value || "")) return;
    await updateRow(table, rowId, { [field]: joined || null });
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 1000);
  };

  const toggleOption = (opt) => {
    setMultiDraft(prev =>
      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
    );
  };

  const cancel = () => {
    setDraft(value ?? "");
    setMultiDraft(parseMulti(value));
    setEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && type !== "textarea" && type !== "multiselect") save();
    if (e.key === "Escape") cancel();
  };

  const inputStyle = {
    width: "100%",
    fontSize: 13,
    fontFamily: "inherit",
    border: "0.5px solid #B4B2A9",
    borderRadius: 7,
    padding: "6px 10px",
    outline: "none",
    background: "#FFFFFF",
    color: "#2C2C2A",
    boxSizing: "border-box",
  };

  if (editing) {
    if (type === "multiselect" && options) {
      return (
        <div ref={containerRef} style={{ border: "0.5px solid #B4B2A9", borderRadius: 7, background: "#FFFFFF", padding: "6px 0" }}>
          {options.filter(o => o).map((o) => (
            <label key={o} onClick={() => toggleOption(o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#2C2C2A", background: multiDraft.includes(o) ? "#F1EFE8" : "transparent" }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #B4B2A9", background: multiDraft.includes(o) ? "#042C53" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {multiDraft.includes(o) && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              {o}
            </label>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 2px", gap: 6 }}>
            <button onClick={cancel} style={{ padding: "3px 10px", borderRadius: 5, border: "0.5px solid #D3D1C7", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "#888780" }}>Cancel</button>
            <button onClick={saveMulti} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#042C53", color: "#B5D4F4", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Save</button>
          </div>
        </div>
      );
    }
    if (type === "select" && options) {
      return (
        <select
          ref={inputRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onBlur={save}
          onKeyDown={onKeyDown}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (type === "textarea") {
      return (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={draft}
        min={type === "number" && field === "probability" ? 0 : undefined}
        max={type === "number" && field === "probability" ? 100 : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        style={inputStyle}
      />
    );
  }

  const shown = displayValue != null ? displayValue : (value ?? "—");

  return (
    <span
      onClick={() => { setDraft(value ?? ""); if (type === "multiselect") setMultiDraft(parseMulti(value)); setEditing(true); }}
      style={{ cursor: "pointer", borderBottom: "1px dashed transparent", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderBottom = "1px dashed #B4B2A9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderBottom = "1px dashed transparent"; }}
    >
      {shown}{suffix}
      {saved && <span style={{ color: "#1D9E75", marginLeft: 5, fontWeight: 600 }}>✓</span>}
    </span>
  );
}
