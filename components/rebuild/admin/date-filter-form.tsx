type DateFilterFormProps = {
  dateFrom: string;
  dateTo: string;
  submitLabel: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function DateFilterForm({
  dateFrom,
  dateTo,
  submitLabel,
  onDateFromChange,
  onDateToChange,
  onSubmit,
  onClear,
}: DateFilterFormProps) {
  return (
    <form
      style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label className="rb-form-label">Data inicial</label>
        <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} className="rb-field" />
      </div>
      <div>
        <label className="rb-form-label">Data final</label>
        <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} className="rb-field" />
      </div>
      <button className="rb-btn-primary" type="submit">
        {submitLabel}
      </button>
      <button className="rb-btn-ghost" type="button" onClick={onClear}>
        Limpar
      </button>
    </form>
  );
}
