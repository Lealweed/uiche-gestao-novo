"use client";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { tolerantData, isSchemaToleranceError } from "@/lib/schema-tolerance";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Card, CardTitle } from "@/components/rebuild/ui/card";
import { StatCard } from "@/components/rebuild/ui/stat-card";
import { Select, Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge, PaymentBadge } from "@/components/rebuild/ui/badge";
import { SectionHeader } from "@/components/rebuild/ui/section-header";

const supabase = createClient();

type Option     = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null };
type Category   = { id: string; name: string };
type Subcategory= { id: string; name: string; category_id: string };
type Shift      = { id: string; booth_id: string; status: "open" | "closed" };
type Tx = { id: string; amount: number; payment_method: "pix"|"credit"|"debit"|"cash"; sold_at: string; ticket_reference: string|null; note: string|null; company_id: string|null; company_name: string; receipt_count: number };
type BoothLink  = { booth_id: string; booth_name: string };
type Punch      = { id: string; punch_type: "entrada"|"saida"|"pausa_inicio"|"pausa_fim"; punched_at: string; note: string|null };
type CashMovement={ id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string };

function getCompanyPct(c: Option) { return Number(c.commission_percent ?? c.comission_percent ?? 0); }

function KpiCard({ label, value, accent, sub }: { label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="rb-kpi-card" style={accent ? { borderColor:"rgba(245,158,11,0.3)", boxShadow:"var(--ds-glow-amber)" } : {}}>
      <p className="rb-kpi-label">{label}</p>
      <p className="rb-kpi-value" style={accent ? { color:"var(--ds-primary)" } : {}}>{value}</p>
      {sub && <p className="rb-kpi-hint">{sub}</p>}
    </div>
  );
}

function PayBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rb-pay-chip${active ? " is-active" : ""}`}>
      {label}
    </button>
  );
}

export default function OperatorRebuildPage() {
  const router = useRouter();
  const [userId, setUserId]             = useState<string|null>(null);
  const [operatorActive, setOperatorActive] = useState<boolean|null>(null);
  const [shift, setShift]               = useState<Shift|null>(null);
  const [companies, setCompanies]       = useState<Option[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [booths, setBooths]             = useState<BoothLink[]>([]);
  const [boothId, setBoothId]           = useState("");
  const [companyId, setCompanyId]       = useState("");
  const [categoryId, setCategoryId]     = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [amount, setAmount]             = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix"|"credit"|"debit"|"cash">("pix");
  const [ticketReference, setTicketReference] = useState("");
  const [note, setNote]                 = useState("");
  const [message, setMessage]           = useState<string|null>(null);
  const [txs, setTxs]                   = useState<Tx[]>([]);
  const [punches, setPunches]           = useState<Punch[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashType, setCashType]         = useState<"suprimento"|"sangria"|"ajuste">("suprimento");
  const [cashAmount, setCashAmount]     = useState("");
  const [cashNote, setCashNote]         = useState("");
  const [uploadingTxId, setUploadingTxId] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? "";
      if (!uid) return router.push("/login");
      setUserId(uid);

      const { data: profile } = await supabase.from("profiles").select("role,active").eq("user_id",uid).single();
      setOperatorActive((profile as { active?: boolean }|null)?.active ?? null);
      if ((profile as { role?: string }|null)?.role === "admin") return router.push("/admin");

      const [boothLinksRes, companiesRes, categoriesRes, subcategoriesRes, shiftRes, allBoothsRes] = await Promise.all([
        supabase.from("operator_booths").select("booth_id").eq("operator_id",uid).eq("active",true),
        supabase.from("companies").select("*").eq("active",true).order("name"),
        supabase.from("transaction_categories").select("id,name").eq("active",true).order("name"),
        supabase.from("transaction_subcategories").select("id,name,category_id").eq("active",true).order("name"),
        supabase.from("shifts").select("id,booth_id,status").eq("operator_id",uid).eq("status","open").maybeSingle(),
        supabase.from("booths").select("id,name").eq("active",true),
      ]);

      const bData  = tolerantData((boothLinksRes.data as {booth_id:string}[]|null)??[], boothLinksRes.error, [], "Vínculos").data;
      const cData  = tolerantData((companiesRes.data as Option[]|null)??[], companiesRes.error, [], "Empresas").data;
      const catData= tolerantData((categoriesRes.data as Category[]|null)??[], categoriesRes.error, [], "Categorias").data;
      const subData= tolerantData((subcategoriesRes.data as Subcategory[]|null)??[], subcategoriesRes.error, [], "Subcategorias").data;
      const allBooths= tolerantData((allBoothsRes.data as {id:string;name:string}[]|null)??[], allBoothsRes.error, [], "Guichês").data;

      const boothNameMap = new Map((allBooths??[]).map((b:{id:string;name:string})=>[b.id,b.name]));
      const boothRows = ((bData??[]) as {booth_id:string}[]).map(b=>({ booth_id:b.booth_id, booth_name:boothNameMap.get(b.booth_id)??b.booth_id }));
      setBooths(boothRows); setCompanies(cData??[]);
      const cats = catData??[]; const subs = subData??[];
      setCategories(cats); setSubcategories(subs);
      if (cats[0]) { setCategoryId(cats[0].id); const first=subs.find(s=>s.category_id===cats[0].id); setSubcategoryId(first?.id??""); }

      const sData = shiftRes.data as Shift|null;
      if (sData) { setShift(sData); await loadTxs(sData.id); await loadCashMovements(sData.id); }
      await loadPunches(uid);
      if (!sData && bData?.[0]) setBoothId((bData[0] as {booth_id:string}).booth_id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTxs(shiftId: string) {
    const txRes = await supabase.from("transactions").select("id,amount,payment_method,sold_at,ticket_reference,note,company_id").eq("shift_id",shiftId).eq("status","posted").order("sold_at",{ascending:false}).limit(100);
    if (txRes.error) return;
    const baseTxs = (txRes.data??[]) as Array<{id:string;amount:number;payment_method:"pix"|"credit"|"debit"|"cash";sold_at:string;ticket_reference:string|null;note:string|null;company_id:string|null}>;
    const txIds = baseTxs.map(t=>t.id);
    const companyIds = Array.from(new Set(baseTxs.map(t=>t.company_id).filter(Boolean))) as string[];
    const [receiptRes,companyRes] = await Promise.all([
      txIds.length ? supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id",txIds) : Promise.resolve({data:[],error:null} as any),
      companyIds.length ? supabase.from("companies").select("id,name").in("id",companyIds) : Promise.resolve({data:[],error:null} as any),
    ]);
    const receiptCounts = new Map<string,number>();
    for (const r of (receiptRes.data??[]) as {transaction_id:string}[]) receiptCounts.set(r.transaction_id,(receiptCounts.get(r.transaction_id)??0)+1);
    const companyNames = new Map<string,string>();
    for (const c of (companyRes.data??[]) as {id:string;name:string}[]) companyNames.set(c.id,c.name);
    setTxs(baseTxs.map(tx=>({ ...tx, company_name:tx.company_id?companyNames.get(tx.company_id)??"-":"-", receipt_count:receiptCounts.get(tx.id)??0 })));
  }

  async function loadPunches(uid: string) {
    const res = await supabase.from("time_punches").select("id,punch_type,punched_at,note").eq("user_id",uid).order("punched_at",{ascending:false}).limit(20);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setPunches((res.data as Punch[]|null)??[]);
  }

  async function loadCashMovements(shiftId: string) {
    const res = await supabase.from("cash_movements").select("id,movement_type,amount,note,created_at").eq("shift_id",shiftId).order("created_at",{ascending:false}).limit(100);
    if (res.error && !isSchemaToleranceError(res.error)) return;
    setCashMovements((res.data as CashMovement[]|null)??[]);
  }

  async function logAction(action: string, entity?: string, entityId?: string, details?: Record<string,unknown>) {
    if (!userId) return;
    await supabase.from("audit_logs").insert({ created_by:userId, action, entity:entity??null, entity_id:entityId??null, details:details??{} });
  }

  async function openShift() {
    if (!boothId) return setMessage("Selecione um guichê.");
    const { data, error } = await supabase.rpc("open_shift",{p_booth_id:boothId,p_ip:null});
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("OPEN_SHIFT","shifts",(data as Shift).id,{booth_id:boothId});
    setShift(data as Shift); setMessage("Turno aberto.");
    await loadTxs((data as Shift).id); await loadCashMovements((data as Shift).id);
  }

  async function closeShift() {
    if (!shift||!userId) return;
    const pending = txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0).length;
    if (pending>0) return setMessage(`${pending} lançamento(s) sem comprovante.`);
    const cashSales = txs.filter(t=>t.payment_method==="cash").reduce((a,t)=>a+Number(t.amount||0),0);
    const sup=cashMovements.filter(m=>m.movement_type==="suprimento").reduce((a,m)=>a+Number(m.amount||0),0);
    const sang=cashMovements.filter(m=>m.movement_type==="sangria").reduce((a,m)=>a+Number(m.amount||0),0);
    const ajust=cashMovements.filter(m=>m.movement_type==="ajuste").reduce((a,m)=>a+Number(m.amount||0),0);
    const expectedCash = cashSales+sup-sang+ajust;
    const declaredRaw = window.prompt(`Valor esperado: R$ ${expectedCash.toFixed(2)}\nInforme o valor contado:`);
    if (declaredRaw===null) return;
    const declaredCash = Number(declaredRaw.replace(",","."));
    if (Number.isNaN(declaredCash)) return setMessage("Valor inválido.");
    const obs = window.prompt("Observação (opcional):") || null;
    const difference = Number((declaredCash-expectedCash).toFixed(2));
    await supabase.from("shift_cash_closings").upsert({ shift_id:shift.id, booth_id:shift.booth_id, user_id:userId, expected_cash:Number(expectedCash.toFixed(2)), declared_cash:Number(declaredCash.toFixed(2)), difference, note:obs });
    const { error } = await supabase.rpc("close_shift",{p_shift_id:shift.id,p_ip:null,p_notes:obs});
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CLOSE_SHIFT","shifts",shift.id,{expected_cash:expectedCash,declared_cash:declaredCash,difference});
    setShift(null); setTxs([]); setCashMovements([]); setMessage(`Turno encerrado. Diferença: R$ ${difference.toFixed(2)}.`);
  }

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;
    const label = type==="entrada"?"Entrada":type==="saida"?"Saída":type==="pausa_inicio"?"Início de pausa":"Fim de pausa";
    const { error } = await supabase.from("time_punches").insert({ user_id:userId, booth_id:(shift?.booth_id??boothId)||null, shift_id:shift?.id??null, punch_type:type, note:label });
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("TIME_PUNCH","time_punches",undefined,{type});
    await loadPunches(userId); setMessage(`Ponto: ${label}.`);
  }

  async function submitCashMovement(e: FormEvent) {
    e.preventDefault();
    if (!shift||!userId||!cashAmount) return;
    const { error } = await supabase.from("cash_movements").insert({ shift_id:shift.id, booth_id:shift.booth_id, user_id:userId, movement_type:cashType, amount:Number(cashAmount), note:cashNote.trim()||null });
    if (error) return setMessage(`Erro: ${error.message}`);
    setCashAmount(""); setCashNote(""); await loadCashMovements(shift.id); setMessage("Movimento registrado.");
  }

  async function submitTx(e: FormEvent) {
    e.preventDefault();
    if (!shift||!companyId||!categoryId||!subcategoryId||!amount||!userId) return;
    const { data: inserted, error } = await supabase.from("transactions").insert({ shift_id:shift.id, booth_id:shift.booth_id, operator_id:userId, company_id:companyId, category_id:categoryId, subcategory_id:subcategoryId, amount:Number(amount), payment_method:paymentMethod, commission_percent:null, ticket_reference:ticketReference||null, note:note||null }).select("id").single();
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CREATE_TRANSACTION","transactions",inserted?.id,{amount:Number(amount),payment_method:paymentMethod});
    setAmount(""); setTicketReference(""); setNote(""); setMessage("Lançamento salvo."); await loadTxs(shift.id);
  }

  async function handleUploadReceipt(txId: string, ev: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = ev.target.files?.[0]; if (!file) return;
    setUploadingTxId(txId);
    const ext = file.name.split(".").pop()||"jpg";
    const path = `${userId}/${txId}.${ext}`;
    const up = await supabase.storage.from("payment-receipts").upload(path,file,{upsert:true,contentType:file.type||"image/jpeg"});
    if (up.error) { setMessage(`Erro upload: ${up.error.message}`); setUploadingTxId(null); return; }
    await supabase.from("transaction_receipts").upsert({ transaction_id:txId, storage_path:path, mime_type:file.type||"image/jpeg", uploaded_by:userId });
    await logAction("UPLOAD_RECEIPT","transactions",txId,{path});
    setMessage("Comprovante enviado."); if (shift) await loadTxs(shift.id); setUploadingTxId(null);
  }

  const totals = useMemo(()=>txs.reduce((acc,tx)=>{ acc[tx.payment_method]+=Number(tx.amount||0); return acc; },{pix:0,credit:0,debit:0,cash:0}),[txs]);
  const totalGeral = totals.pix+totals.credit+totals.debit+totals.cash;
  const cashTotals = useMemo(()=>{
    const s=cashMovements.filter(m=>m.movement_type==="suprimento").reduce((a,m)=>a+Number(m.amount||0),0);
    const g=cashMovements.filter(m=>m.movement_type==="sangria").reduce((a,m)=>a+Number(m.amount||0),0);
    const j=cashMovements.filter(m=>m.movement_type==="ajuste").reduce((a,m)=>a+Number(m.amount||0),0);
    return {suprimento:s,sangria:g,ajuste:j,saldo:s-g+j};
  },[cashMovements]);
  const filteredSubs = useMemo(()=>subcategories.filter(s=>s.category_id===categoryId),[subcategories,categoryId]);
  const pendingReceiptTxs = useMemo(()=>txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0),[txs]);
  const operatorBlocked = operatorActive===false;

  return (
    <RebuildShell>
      {/* ── topbar ── */}
          <Card className="p-0">
            <SectionHeader title="Ponto digital" />
            <div className="flex flex-wrap gap-2 mb-3">
              {(["entrada","pausa_inicio","pausa_fim","saida"] as const).map(t=>(
                <Button
                  key={t}
                  variant={t==="entrada"?"primary":"ghost"}
                  size="sm"
                  disabled={operatorBlocked}
                  onClick={()=>registerPunch(t)}
                  className="flex-1 min-w-[120px]"
                >
                  {t==="entrada"?"Entrada":t==="pausa_inicio"?"Início pausa":t==="pausa_fim"?"Fim pausa":"Saída"}
                </Button>
              ))}
            </div>
            {punches.length > 0 && (
              <DataTable
                columns={[
                  { key: "ponto", header: "Ponto", render: (p) => p.note ?? p.punch_type },
                  { key: "hora", header: "Hora", render: (p) => <span className="text-muted-foreground">{new Date(p.punched_at).toLocaleString("pt-BR")}</span> },
                ]}
                rows={punches.slice(0,10)}
                className="mt-2"
              />
            )}
          </Card>
      <div className="rb-operator-layout">

        {/* LEFT — main actions */}
        <div style={{ display:"grid", gap:"1.25rem" }}>

          {/* Turno control */}
          <Card className="bg-white/5 border border-white/10 backdrop-blur p-6">
            <CardTitle>Controle de turno</CardTitle>
            {!shift ? (
              <div className="space-y-4">
                <Select
                  value={boothId}
                  onChange={e => setBoothId(e.target.value)}
                  className="bg-transparent border border-white/20 text-white rounded-lg p-2"
                  disabled={operatorBlocked}
                  label="Selecionar Guichê"
                >
                  <option value="">Selecione o guichê</option>
                  {booths.map(b => (
                    <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>
                  ))}
                </Select>
                {booths.length === 0 && (
                  <p className="text-amber-400 text-sm">Nenhum guichê vinculado. Contate o admin.</p>
                )}
                <Button
                  variant="primary"
                  className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl font-bold"
                  type="button"
                  onClick={openShift}
                  disabled={operatorBlocked || !boothId}
                >
                  Abrir turno
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-white/60">Guichê ativo</p>
                  <p className="font-bold text-emerald-400">Turno em andamento</p>
                </div>
                <Button
                  variant="ghost"
                  className="border border-rose-400/40 text-rose-400"
                  type="button"
                  onClick={closeShift}
                  disabled={operatorBlocked}
                >
                  Encerrar turno
                </Button>
              </div>
            )}
          </Card>

          {/* Ponto */}
          <div className="rb-panel">
            <p className="rb-panel-title" style={{ marginBottom:"0.75rem" }}>Ponto digital</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", marginBottom:"0.75rem" }}>
              {(["entrada","pausa_inicio","pausa_fim","saida"] as const).map(t=>(
                <button key={t} type="button"
                  className={t==="entrada"?"rb-btn-primary":"rb-btn-ghost"}
                  disabled={operatorBlocked}
                  onClick={()=>registerPunch(t)}
                  style={{ flex:"1 1 120px" }}>
                  {t==="entrada"?"Entrada":t==="pausa_inicio"?"Início pausa":t==="pausa_fim"?"Fim pausa":"Saída"}
                </button>
              ))}
            </div>
            {punches.length > 0 && (
              <div className="rb-table-wrap">
                <table className="rb-table">
                  <thead><tr><th>Ponto</th><th>Hora</th></tr></thead>
                  <tbody>
                    {punches.slice(0,10).map(p=>(
                      <tr key={p.id}>
                        <td>{p.note ?? p.punch_type}</td>
                        <td style={{ color:"var(--ds-muted)" }}>{new Date(p.punched_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comprovantes pendentes */}
          {pendingReceiptTxs.length > 0 && (
            <div className="rb-panel" style={{ border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.04)" }}>
              <p className="rb-panel-title" style={{ marginBottom:"0.75rem", color:"var(--ds-primary)" }}>
                ⚠ Comprovantes pendentes ({pendingReceiptTxs.length})
              </p>
              <div style={{ display:"grid", gap:"0.5rem" }}>
                {pendingReceiptTxs.slice(0,8).map(tx=>(
                  <div key={tx.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem", padding:"0.65rem 0.75rem", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"var(--ds-radius-sm)", background:"rgba(245,158,11,0.05)" }}>
                    <div>
                      <p style={{ fontSize:"0.875rem", fontWeight:600 }}>{tx.company_name} · R$ {Number(tx.amount).toFixed(2)}</p>
                      <p style={{ fontSize:"0.75rem", color:"var(--ds-muted)" }}>{tx.payment_method.toUpperCase()} · {new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                    <label className="rb-btn-ghost" style={{ cursor:"pointer", fontSize:"0.8125rem", minHeight:"auto", padding:"0.3rem 0.65rem" }}>
                      {uploadingTxId===tx.id ? "Enviando..." : "Anexar"}
                      <input type="file" accept="image/*" className="hidden" style={{ display:"none" }} disabled={uploadingTxId===tx.id||operatorBlocked} onChange={e=>handleUploadReceipt(tx.id,e)} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de lançamentos */}
          <Card className="p-0">
            <SectionHeader title="Lançamentos do turno" />
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => <span className="text-muted-foreground text-xs">{new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span> },
                { key: "empresa", header: "Empresa", render: (tx) => <span className="font-semibold">{tx.company_name}</span> },
                { key: "metodo", header: "Método", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold">R$ {Number(tx.amount).toFixed(2)}</span> },
                { key: "comprovante", header: "Comprovante", render: (tx) => tx.receipt_count>0 ? <Badge variant="success">✓</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : "—" },
              ]}
              rows={txs}
              emptyMessage="Sem lançamentos neste turno."
              className="mt-2"
            />
          </Card>
        </div>

        {/* RIGHT — forms */}
        <div style={{ display:"grid", gap:"1.25rem" }}>

          {/* Novo lançamento */}
          <Card className="p-0">
            <SectionHeader title="Novo lançamento" />
            <form onSubmit={submitTx} className="grid gap-3 p-4">
              <Select
                label="Empresa"
                value={companyId}
                onChange={e=>setCompanyId(e.target.value)}
                required
                disabled={!shift||operatorBlocked}
              >
                <option value="">Selecione a empresa</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name} ({getCompanyPct(c)}%)</option>)}
              </Select>
              <Select
                label="Categoria"
                value={categoryId}
                onChange={e=>{ setCategoryId(e.target.value); const first=subcategories.find(s=>s.category_id===e.target.value); setSubcategoryId(first?.id??""); }}
                required
                disabled={!shift||operatorBlocked}
              >
                <option value="">Selecione a categoria</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select
                label="Subcategoria"
                value={subcategoryId}
                onChange={e=>setSubcategoryId(e.target.value)}
                required
                disabled={!shift||operatorBlocked}
              >
                <option value="">Selecione</option>
                {filteredSubs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <div>
                <label className="rb-form-label">Forma de pagamento</label>
                <div className="flex gap-2">
                  {(["pix","credit","debit","cash"] as const).map(m=>(
                    <Button
                      key={m}
                      type="button"
                      variant={paymentMethod===m?"primary":"ghost"}
                      size="sm"
                      className="flex-1"
                      onClick={()=>setPaymentMethod(m)}
                    >
                      {m==="pix"?"PIX":m==="credit"?"Crédito":m==="debit"?"Débito":"Dinheiro"}
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                label="Valor (R$)"
                value={amount}
                onChange={e=>setAmount(e.target.value)}
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                disabled={!shift||operatorBlocked}
              />
              <Input
                label="Referência / Bilhete"
                value={ticketReference}
                onChange={e=>setTicketReference(e.target.value)}
                placeholder="Ex: 12345"
                disabled={!shift||operatorBlocked}
              />
              <Input
                label="Observação"
                value={note}
                onChange={e=>setNote(e.target.value)}
                placeholder="Opcional"
                disabled={!shift||operatorBlocked}
              />
              <Button type="submit" variant="primary" disabled={!shift||operatorBlocked}>Registrar lançamento</Button>
            </form>
          </Card>

          {/* Caixa / Movimentos */}
          <Card className="p-0">
            <SectionHeader title="Caixa PDV" />
            <div className="grid grid-cols-2 gap-2 p-4">
              <KpiCard label="Suprimento" value={`R$ ${cashTotals.suprimento.toFixed(2)}`} />
              <KpiCard label="Sangria"    value={`R$ ${cashTotals.sangria.toFixed(2)}`} />
              <KpiCard label="Ajuste"     value={`R$ ${cashTotals.ajuste.toFixed(2)}`} />
              <KpiCard label="Saldo"      value={`R$ ${cashTotals.saldo.toFixed(2)}`} accent />
            </div>
            <form onSubmit={submitCashMovement} className="grid gap-2 p-4 pt-0">
              <Select
                value={cashType}
                onChange={e=>setCashType(e.target.value as typeof cashType)}
                disabled={!shift||operatorBlocked}
                label="Tipo de movimento"
              >
                <option value="suprimento">Suprimento</option>
                <option value="sangria">Sangria</option>
                <option value="ajuste">Ajuste</option>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={cashAmount}
                  onChange={e=>setCashAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor"
                  disabled={!shift||operatorBlocked}
                  label="Valor"
                />
                <Input
                  value={cashNote}
                  onChange={e=>setCashNote(e.target.value)}
                  placeholder="Obs (opcional)"
                  disabled={!shift||operatorBlocked}
                  label="Observação"
                />
              </div>
              <Button type="submit" variant="primary" disabled={!shift||operatorBlocked}>Registrar</Button>
            </form>
          </Card>
        </div>
      </div>
    </RebuildShell>
  );
}
