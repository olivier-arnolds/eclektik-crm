import { useState, useRef, useEffect } from "react";

export default function EditableField({ value, field, table, rowId, type = "text", options, refetch, updateRow, displayValue, suffix = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === "text" || type === "number") inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

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

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && type !== "textarea") save();
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
    if (options) {
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
      onClick={() => { setDraft(value ?? ""); setEditing(true); }}
      style={{ cursor: "pointer", borderBottom: "1px dashed transparent", transition: "border-color 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderBottom = "1px dashed #B4B2A9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderBottom = "1px dashed transparent"; }}
    >
      {shown}{suffix}
      {saved && <span style={{ color: "#1D9E75", marginLeft: 5, fontWeight: 600 }}>✓</span>}
    </span>
  );
}
