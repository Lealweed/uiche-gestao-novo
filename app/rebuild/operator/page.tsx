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
import { Toast } from "@/components/rebuild/ui/toast";
import { DollarSign, TrendingUp, Wallet, AlertTriangle } from "lucide-react";

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

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

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

      const bData  = tolerantData((boothLinksRes.data as {booth_id:string}[]|null)??[], boothLinksRes.error, [], "Vinculos").data;
      const cData  = tolerantData((companiesRes.data as Option[]|null)??[], companiesRes.error, [], "Empresas").data;
      const catData= tolerantData((categoriesRes.data as Category[]|null)??[], categoriesRes.error, [], "Categorias").data;
      const subData= tolerantData((subcategoriesRes.data as Subcategory[]|null)??[], subcategoriesRes.error, [], "Subcategorias").data;
      const allBooths= tolerantData((allBoothsRes.data as {id:string;name:string}[]|null)??[], allBoothsRes.error, [], "Guiches").data;

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
    if (!boothId) return setMessage("Selecione um guiche.");
    const { data, error } = await supabase.rpc("open_shift",{p_booth_id:boothId,p_ip:null});
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("OPEN_SHIFT","shifts",(data as Shift).id,{booth_id:boothId});
    setShift(data as Shift); setMessage("Turno aberto.");
    await loadTxs((data as Shift).id); await loadCashMovements((data as Shift).id);
  }

  async function openCloseShiftModal() {
    if (!shift||!userId) return;
    const pending = txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0).length;
    if (pending>0) return setMessage(`${pending} lancamento(s) sem comprovante.`);
    const cashSales = txs.filter(t=>t.payment_method==="cash").reduce((a,t)=>a+Number(t.amount||0),0);
    const sup=cashMovements.filter(m=>m.movement_type==="suprimento").reduce((a,m)=>a+Number(m.amount||0),0);
    const sang=cashMovements.filter(m=>m.movement_type==="sangria").reduce((a,m)=>a+Number(m.amount||0),0);
    const ajust=cashMovements.filter(m=>m.movement_type==="ajuste").reduce((a,m)=>a+Number(m.amount||0),0);
    setExpectedCashVal(cashSales+sup-sang+ajust);
    setCloseDeclared("");
    setCloseObs("");
    setShowCloseModal(true);
  }

  async function confirmCloseShift() {
    if (!shift||!userId) return;
    setIsClosing(true);
    try {
      const declaredCash = Number(closeDeclared.replace(",","."));
      if (Number.isNaN(declaredCash)) { setMessage("Valor invalido."); return; }
      const difference = Number((declaredCash-expectedCashVal).toFixed(2));
      const obs = closeObs.trim() || null;
      await supabase.from("shift_cash_closings").upsert({ shift_id:shift.id, booth_id:shift.booth_id, user_id:userId, expected_cash:Number(expectedCashVal.toFixed(2)), declared_cash:Number(declaredCash.toFixed(2)), difference, note:obs });
      const { error } = await supabase.rpc("close_shift",{p_shift_id:shift.id,p_ip:null,p_notes:obs});
      if (error) { setMessage(`Erro: ${error.message}`); return; }
      await logAction("CLOSE_SHIFT","shifts",shift.id,{expected_cash:expectedCashVal,declared_cash:declaredCash,difference});
      setShift(null); setTxs([]); setCashMovements([]); setShowCloseModal(false); setMessage(`Turno encerrado. Diferenca: R$ ${difference.toFixed(2)}.`);
    } finally {
      setIsClosing(false);
    }
  }

  async function registerPunch(type: Punch["punch_type"]) {
    if (!userId) return;
    const label = type==="entrada"?"Entrada":type==="saida"?"Saida":type==="pausa_inicio"?"Inicio de pausa":"Fim de pausa";
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
    setAmount(""); setTicketReference(""); setNote(""); setMessage("Lancamento salvo."); await loadTxs(shift.id);
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
      <Toast message={message} onClose={() => setMessage(null)} type="info" />

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Central Viagem</p>
        <h1 className="text-2xl font-bold text-foreground">Painel do Operador</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total PIX" value={`R$ ${totals.pix.toFixed(2)}`} icon={<Wallet size={20} />} />
        <StatCard label="Total Credito" value={`R$ ${totals.credit.toFixed(2)}`} icon={<DollarSign size={20} />} />
        <StatCard label="Total Debito" value={`R$ ${totals.debit.toFixed(2)}`} icon={<DollarSign size={20} />} />
        <StatCard label="Total Geral" value={`R$ ${totalGeral.toFixed(2)}`} icon={<TrendingUp size={20} />} />
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* LEFT - Main actions */}
        <div className="space-y-6">

          {/* Turno control */}
          <Card>
            <CardTitle>Controle de turno</CardTitle>
            {!shift ? (
              <div className="space-y-4 mt-4">
                <Select
                  value={boothId}
                  onChange={e => setBoothId(e.target.value)}
                  disabled={operatorBlocked}
                  label="Selecionar Guiche"
                >
                  <option value="">Selecione o guiche</option>
                  {booths.map(b => (
                    <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>
                  ))}
                </Select>
                {booths.length === 0 && (
                  <p className="text-amber-600 text-sm">Nenhum guiche vinculado. Contate o admin.</p>
                )}
                <Button
                  variant="accent"
                  type="button"
                  onClick={openShift}
                  disabled={operatorBlocked || !boothId}
                  className="w-full"
                >
                  Abrir turno
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted">Guiche ativo</p>
                  <p className="font-bold text-emerald-600">Turno em andamento</p>
                </div>
                <Button
                  variant="danger"
                  type="button"
                  onClick={openCloseShiftModal}
                  disabled={operatorBlocked}
                >
                  Encerrar turno
                </Button>
              </div>
            )}
          </Card>

          {/* Ponto digital */}
          <Card>
            <SectionHeader title="Ponto digital" className="mb-4" />
            <div className="flex flex-wrap gap-2 mb-4">
              {(["entrada","pausa_inicio","pausa_fim","saida"] as const).map(t=>(
                <Button
                  key={t}
                  variant={t==="entrada"?"primary":"ghost"}
                  size="sm"
                  disabled={operatorBlocked}
                  onClick={()=>registerPunch(t)}
                  className="flex-1 min-w-[100px]"
                >
                  {t==="entrada"?"Entrada":t==="pausa_inicio"?"Inicio pausa":t==="pausa_fim"?"Fim pausa":"Saida"}
                </Button>
              ))}
            </div>
            {punches.length > 0 && (
              <DataTable
                columns={[
                  { key: "ponto", header: "Ponto", render: (p) => p.note ?? p.punch_type },
                  { key: "hora", header: "Hora", render: (p) => <span className="text-muted text-xs">{new Date(p.punched_at).toLocaleString("pt-BR")}</span> },
                ]}
                rows={punches.slice(0,10)}
              />
            )}
          </Card>

          {/* Comprovantes pendentes */}
          {pendingReceiptTxs.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-amber-600" size={20} />
                <h3 className="font-semibold text-amber-800">Comprovantes pendentes ({pendingReceiptTxs.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingReceiptTxs.slice(0,8).map(tx=>(
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-amber-200">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tx.company_name} - R$ {Number(tx.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted">{tx.payment_method.toUpperCase()} - {new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="sm" as="span">
                        {uploadingTxId===tx.id ? "Enviando..." : "Anexar"}
                      </Button>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingTxId===tx.id||operatorBlocked} onChange={e=>handleUploadReceipt(tx.id,e)} />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Historico de lancamentos */}
          <Card>
            <SectionHeader title="Lancamentos do turno" className="mb-4" />
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => <span className="text-muted text-xs">{new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span> },
                { key: "empresa", header: "Empresa", render: (tx) => <span className="font-semibold">{tx.company_name}</span> },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold">R$ {Number(tx.amount).toFixed(2)}</span> },
                { key: "comprovante", header: "Comprovante", render: (tx) => tx.receipt_count>0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : "-" },
              ]}
              rows={txs}
              emptyMessage="Sem lancamentos neste turno."
            />
          </Card>
        </div>

        {/* RIGHT - Forms */}
        <div className="space-y-6">

          {/* Novo lancamento */}
          <Card>
            <SectionHeader title="Novo lancamento" className="mb-4" />
            <form onSubmit={submitTx} className="space-y-4">
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
                <label className="block text-sm font-medium text-foreground mb-2">Forma de pagamento</label>
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
                      {m==="pix"?"PIX":m==="credit"?"Credito":m==="debit"?"Debito":"Dinheiro"}
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
                label="Referencia / Bilhete"
                value={ticketReference}
                onChange={e=>setTicketReference(e.target.value)}
                placeholder="Ex: 12345"
                disabled={!shift||operatorBlocked}
              />
              <Input
                label="Observacao"
                value={note}
                onChange={e=>setNote(e.target.value)}
                placeholder="Opcional"
                disabled={!shift||operatorBlocked}
              />
              <Button type="submit" variant="primary" disabled={!shift||operatorBlocked} className="w-full">
                Registrar lancamento
              </Button>
            </form>
          </Card>

          {/* Caixa PDV */}
          <Card>
            <SectionHeader title="Caixa PDV" className="mb-4" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Suprimento" value={`R$ ${cashTotals.suprimento.toFixed(2)}`} className="p-3" />
              <StatCard label="Sangria" value={`R$ ${cashTotals.sangria.toFixed(2)}`} className="p-3" />
              <StatCard label="Ajuste" value={`R$ ${cashTotals.ajuste.toFixed(2)}`} className="p-3" />
              <StatCard label="Saldo" value={`R$ ${cashTotals.saldo.toFixed(2)}`} deltaType="positive" className="p-3" />
            </div>
            <form onSubmit={submitCashMovement} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-3">
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
                  label="Observacao"
                />
              </div>
              <Button type="submit" variant="primary" disabled={!shift||operatorBlocked} className="w-full">
                Registrar movimento
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Modal Fechamento */}
      {showCloseModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Fechamento de Caixa</h2>
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg flex justify-between items-center border border-emerald-200">
                <span className="text-sm text-muted">Valor Esperado Gaveta</span>
                <span className="text-emerald-700 font-bold">R$ {expectedCashVal.toFixed(2)}</span>
              </div>
              <Input
                label="Valor Contado (Gaveta)"
                value={closeDeclared}
                onChange={e => setCloseDeclared(e.target.value)}
                autoFocus
                type="number"
                min="0"
                step="0.01"
              />
              <Input
                label="Observacoes do Fechamento (Opcional)"
                value={closeObs}
                onChange={e => setCloseObs(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={confirmCloseShift} disabled={isClosing || !closeDeclared}>
                {isClosing ? "Encerrando..." : "Confirmar Encerramento"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </RebuildShell>
  );
}
