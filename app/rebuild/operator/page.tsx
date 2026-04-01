"use client";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { tolerantData, isSchemaToleranceError } from "@/lib/schema-tolerance";
import { RebuildShell } from "@/components/rebuild/shell/rebuild-shell";
import { Card, CardTitle } from "@/components/rebuild/ui/card";
import { Select, Input } from "@/components/rebuild/ui/input";
import { Button } from "@/components/rebuild/ui/button";
import { DataTable } from "@/components/rebuild/ui/table";
import { Badge, PaymentBadge } from "@/components/rebuild/ui/badge";
import { Toast } from "@/components/rebuild/ui/toast";
import { Plus, RefreshCw, Banknote, CreditCard, Clock, AlertTriangle, Delete, Send, MessageSquare, Link2, Smartphone, Wallet, MapPin, Settings, X, Check, ChevronRight } from "lucide-react";

const supabase = createClient();

type Option     = { id: string; name: string; commission_percent?: number | null; comission_percent?: number | null };
type Category   = { id: string; name: string };
type Subcategory= { id: string; name: string; category_id: string };
type Shift      = { id: string; booth_id: string; status: "open" | "closed" };
type Tx = { id: string; amount: number; payment_method: "pix"|"credit"|"debit"|"cash"; sold_at: string; ticket_reference: string|null; note: string|null; company_id: string|null; company_name: string; receipt_count: number };
type BoothLink  = { booth_id: string; booth_name: string };
type Punch      = { id: string; punch_type: "entrada"|"saida"|"pausa_inicio"|"pausa_fim"; punched_at: string; note: string|null };
type CashMovement={ id: string; movement_type: "suprimento"|"sangria"|"ajuste"; amount: number; note: string|null; created_at: string; user_name?: string };

function getCompanyPct(c: Option) { return Number(c.commission_percent ?? c.comission_percent ?? 0); }

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDeclared, setCloseDeclared] = useState("");
  const [closeObs, setCloseObs] = useState("");
  const [expectedCashVal, setExpectedCashVal] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<"suprimento"|"sangria">("suprimento");
  
  const [section, setSection] = useState("caixa-pdv");
  const [isMounted, setIsMounted] = useState(false);

  // Estados PDV Calculadora
  const [pdvDisplay, setPdvDisplay] = useState("0");
  const [pdvPaymentMethod, setPdvPaymentMethod] = useState<"cash"|"pix"|"credit"|"debit"|"link">("cash");
  const [pdvCompanyId, setPdvCompanyId] = useState("");
  const [pdvTicketRef, setPdvTicketRef] = useState("");
  const [pdvNote, setPdvNote] = useState("");
  const [showPdvConfirm, setShowPdvConfirm] = useState(false);

  // Taxa de embarque
  type TaxaEmbarque = { id: string; nome: string; valor: number };
  const [taxasEmbarque, setTaxasEmbarque] = useState<TaxaEmbarque[]>([
    { id: "goiania", nome: "Goiania", valor: 8.50 },
    { id: "belem", nome: "Belem", valor: 12.00 },
  ]);
  const [showTaxaConfig, setShowTaxaConfig] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<TaxaEmbarque | null>(null);
  const [taxaEditNome, setTaxaEditNome] = useState("");
  const [taxaEditValor, setTaxaEditValor] = useState("");

  // Chat
  type ChatMessage = { id: string; message: string; created_at: string; read: boolean };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleSectionChange = (e: CustomEvent<string>) => setSection(e.detail);
    window.addEventListener("rebuild:section-change", handleSectionChange as EventListener);
    
    const hash = window.location.hash.replace("#", "");
    if (hash) setSection(hash);
    
    return () => window.removeEventListener("rebuild:section-change", handleSectionChange as EventListener);
  }, []);

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
      txIds.length ? supabase.from("transaction_receipts").select("id,transaction_id").in("transaction_id",txIds) : Promise.resolve({data:[],error:null} as {data:unknown[];error:null}),
      companyIds.length ? supabase.from("companies").select("id,name").in("id",companyIds) : Promise.resolve({data:[],error:null} as {data:unknown[];error:null}),
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
    setCashAmount(""); setCashNote(""); setShowCashModal(false); await loadCashMovements(shift.id); setMessage("Movimento registrado.");
  }

  async function submitTx(e: FormEvent) {
    e.preventDefault();
    if (!shift||!companyId||!categoryId||!subcategoryId||!amount||!userId) return;
    const { data: inserted, error } = await supabase.from("transactions").insert({ shift_id:shift.id, booth_id:shift.booth_id, operator_id:userId, company_id:companyId, category_id:categoryId, subcategory_id:subcategoryId, amount:Number(amount), payment_method:paymentMethod, commission_percent:null, ticket_reference:ticketReference||null, note:note||null }).select("id").single();
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CREATE_TRANSACTION","transactions",inserted?.id,{amount:Number(amount),payment_method:paymentMethod});
    setAmount(""); setTicketReference(""); setNote(""); setMessage("Lancamento salvo."); await loadTxs(shift.id);
  }

  // ===== FUNCOES PDV CALCULADORA =====
  function pdvDigit(d: string) {
    setPdvDisplay(prev => {
      if (prev === "0" && d !== ".") return d;
      if (d === "." && prev.includes(".")) return prev;
      return prev + d;
    });
  }
  function pdvClear() { setPdvDisplay("0"); }
  function pdvBackspace() { setPdvDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : "0"); }
  function pdvAddTaxa(taxa: TaxaEmbarque) {
    const current = parseFloat(pdvDisplay) || 0;
    setPdvDisplay((current + taxa.valor).toFixed(2));
  }

  async function pdvSubmitSale() {
    if (!shift || !pdvCompanyId || pdvDisplay === "0") return;
    const valor = parseFloat(pdvDisplay);
    if (isNaN(valor) || valor <= 0) return setMessage("Valor invalido.");
    
    const defaultCat = categories[0];
    const defaultSub = subcategories.find(s => s.category_id === defaultCat?.id);
    
    const { data: inserted, error } = await supabase.from("transactions").insert({
      shift_id: shift.id,
      booth_id: shift.booth_id,
      operator_id: userId,
      company_id: pdvCompanyId,
      category_id: defaultCat?.id || null,
      subcategory_id: defaultSub?.id || null,
      amount: valor,
      payment_method: pdvPaymentMethod === "link" ? "pix" : pdvPaymentMethod,
      ticket_reference: pdvTicketRef || null,
      note: pdvPaymentMethod === "link" ? `Link de Pagamento - ${pdvNote}` : pdvNote || null,
    }).select("id").single();
    
    if (error) return setMessage(`Erro: ${error.message}`);
    await logAction("CREATE_TRANSACTION", "transactions", inserted?.id, { amount: valor, payment_method: pdvPaymentMethod });
    
    // Reset PDV
    setPdvDisplay("0");
    setPdvTicketRef("");
    setPdvNote("");
    setShowPdvConfirm(false);
    setMessage(`Venda de ${formatCurrency(valor)} registrada!`);
    await loadTxs(shift.id);
  }

  // Taxa de embarque config
  function saveTaxaEdit() {
    if (!editingTaxa) return;
    setTaxasEmbarque(prev => prev.map(t => 
      t.id === editingTaxa.id 
        ? { ...t, nome: taxaEditNome || t.nome, valor: parseFloat(taxaEditValor) || t.valor }
        : t
    ));
    setEditingTaxa(null);
    setShowTaxaConfig(false);
    setMessage("Taxa de embarque atualizada.");
  }

  // ===== FUNCOES CHAT =====
  async function loadChatMessages() {
    if (!userId) return;
    const res = await supabase
      .from("operator_messages")
      .select("id, message, created_at, read")
      .eq("operator_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!res.error) setChatMessages((res.data as ChatMessage[]) || []);
  }

  async function sendChatMessage() {
    if (!userId || !newChatMessage.trim()) return;
    const { error } = await supabase.from("operator_messages").insert({
      operator_id: userId,
      message: newChatMessage.trim(),
      read: false,
    });
    if (error) return setMessage(`Erro: ${error.message}`);
    setNewChatMessage("");
    setMessage("Mensagem enviada para o administrador.");
    await loadChatMessages();
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
    return {suprimento:s,sangria:g,ajuste:j,saldo:totals.cash+s-g+j};
  },[cashMovements, totals.cash]);
  const digitalTotal = totals.pix + totals.credit + totals.debit;
  const filteredSubs = useMemo(()=>subcategories.filter(s=>s.category_id===categoryId),[subcategories,categoryId]);
  const pendingReceiptTxs = useMemo(()=>txs.filter(t=>(t.payment_method==="credit"||t.payment_method==="debit")&&t.receipt_count===0),[txs]);
  const operatorBlocked = operatorActive===false;

  const show = (s: string) => section === s;

  return (
    <RebuildShell>
      <Toast message={message} onClose={() => setMessage(null)} type="info" />

      {/* ===== RESUMO DO TURNO ===== */}
      {show("resumo") && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Resumo do Turno</h1>
            <p className="text-sm text-muted">Visao geral do seu turno atual</p>
          </div>
          
          {/* Controle de Turno */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Status do Turno</p>
                {shift ? (
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success animate-pulse" />
                    <span className="font-semibold text-success">Turno Aberto</span>
                  </div>
                ) : (
                  <span className="font-semibold text-muted">Nenhum turno ativo</span>
                )}
              </div>
              {!shift ? (
                <div className="flex items-center gap-3">
                  <Select
                    value={boothId}
                    onChange={e => setBoothId(e.target.value)}
                    disabled={operatorBlocked}
                    className="w-48"
                  >
                    <option value="">Selecione guiche</option>
                    {booths.map(b => (
                      <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>
                    ))}
                  </Select>
                  <Button variant="success" onClick={openShift} disabled={operatorBlocked || !boothId}>
                    Abrir Turno
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={openCloseShiftModal} disabled={operatorBlocked}>
                  Encerrar Turno
                </Button>
              )}
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[hsl(var(--card-elevated))]">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Total PIX</p>
              <p className="text-2xl font-bold text-info">{formatCurrency(totals.pix)}</p>
            </Card>
            <Card className="bg-[hsl(var(--card-elevated))]">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Total Cartoes</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totals.credit + totals.debit)}</p>
            </Card>
            <Card className="bg-[hsl(var(--card-elevated))]">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Total Dinheiro</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totals.cash)}</p>
            </Card>
            <Card className="bg-[hsl(var(--card-elevated))]">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2">Total Geral</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
            </Card>
          </div>

          {/* Ultimos Lancamentos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Ultimos Lancamentos</h3>
              <Badge variant="secondary">{txs.length} registros</Badge>
            </div>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => tx.company_name },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
              ]}
              rows={txs.slice(0,5)}
              emptyMessage="Sem lancamentos."
            />
          </Card>
        </div>
      )}

      {/* ===== CAIXA PDV ===== */}
      {show("caixa-pdv") && (
        <div className="space-y-6">
          {/* Header com acoes */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Caixa PDV</h1>
              <p className="text-sm text-muted">Sistema de venda rapida</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { loadChatMessages(); setShowChat(true); }}
              >
                <MessageSquare size={16} className="mr-1" />
                Chat
              </Button>
              <Button 
                variant="success" 
                size="sm"
                onClick={() => { setCashModalType("suprimento"); setCashType("suprimento"); setShowCashModal(true); }}
                disabled={!shift || operatorBlocked}
              >
                <Plus size={16} className="mr-1" />
                Suprimento
              </Button>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => { setCashModalType("sangria"); setCashType("sangria"); setShowCashModal(true); }}
                disabled={!shift || operatorBlocked}
              >
                Sangria
              </Button>
            </div>
          </div>

          {/* Layout Principal: Calculadora + Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calculadora PDV */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-0 overflow-hidden">
                {/* Display */}
                <div className="bg-slate-900 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Valor da Venda</span>
                    {shift && <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Turno Ativo</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-bold text-white tracking-tight">
                      R$ {pdvDisplay}
                    </span>
                  </div>
                </div>

                {/* Taxas de Embarque */}
                <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} />
                      Taxa de Embarque
                    </span>
                    <button 
                      onClick={() => setShowTaxaConfig(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Settings size={12} />
                      Editar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {taxasEmbarque.map(taxa => (
                      <button
                        key={taxa.id}
                        onClick={() => pdvAddTaxa(taxa)}
                        disabled={!shift || operatorBlocked}
                        className="flex-1 py-3 px-4 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                      >
                        <span className="block text-sm">{taxa.nome}</span>
                        <span className="block text-lg">{formatCurrency(taxa.valor)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teclado Numerico */}
                <div className="p-4 bg-slate-800/30">
                  <div className="grid grid-cols-4 gap-2">
                    {["7","8","9","C","4","5","6","<","1","2","3",".","00","0","000","OK"].map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === "C") pdvClear();
                          else if (key === "<") pdvBackspace();
                          else if (key === "OK") { if (pdvDisplay !== "0" && pdvCompanyId) setShowPdvConfirm(true); }
                          else pdvDigit(key);
                        }}
                        disabled={!shift || operatorBlocked}
                        className={`py-4 rounded-lg font-bold text-xl transition-all disabled:opacity-50 ${
                          key === "C" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30" :
                          key === "<" ? "bg-slate-600 text-slate-300 hover:bg-slate-500" :
                          key === "OK" ? "bg-emerald-500 text-white hover:bg-emerald-600" :
                          "bg-slate-700 text-slate-200 hover:bg-slate-600"
                        }`}
                      >
                        {key === "<" ? <Delete size={20} className="mx-auto" /> : key}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Selecao Empresa e Forma de Pagamento */}
              <Card>
                <div className="space-y-4">
                  {/* Empresa */}
                  <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-2">Empresa / Viacao</label>
                    <Select
                      value={pdvCompanyId}
                      onChange={e => setPdvCompanyId(e.target.value)}
                      disabled={!shift || operatorBlocked}
                      className="w-full"
                    >
                      <option value="">Selecione a empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({getCompanyPct(c)}%)</option>)}
                    </Select>
                  </div>

                  {/* Formas de Pagamento */}
                  <div>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-2">Forma de Pagamento</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: "cash", label: "Dinheiro", icon: Banknote, color: "emerald" },
                        { id: "pix", label: "PIX", icon: Smartphone, color: "cyan" },
                        { id: "credit", label: "Credito", icon: CreditCard, color: "purple" },
                        { id: "debit", label: "Debito", icon: Wallet, color: "blue" },
                        { id: "link", label: "Link", icon: Link2, color: "orange" },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPdvPaymentMethod(method.id as typeof pdvPaymentMethod)}
                          disabled={!shift || operatorBlocked}
                          className={`py-3 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 disabled:opacity-50 ${
                            pdvPaymentMethod === method.id
                              ? `bg-${method.color}-500/20 border-${method.color}-500 text-${method.color}-400`
                              : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500"
                          }`}
                          style={{
                            backgroundColor: pdvPaymentMethod === method.id ? `rgb(var(--${method.color}-500) / 0.2)` : undefined,
                            borderColor: pdvPaymentMethod === method.id ? `hsl(var(--${method.color === "emerald" ? "success" : method.color === "cyan" ? "info" : "primary"}))` : undefined,
                            color: pdvPaymentMethod === method.id ? `hsl(var(--${method.color === "emerald" ? "success" : method.color === "cyan" ? "info" : "primary"}))` : undefined,
                          }}
                        >
                          <method.icon size={20} />
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos adicionais */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Ref. Bilhete"
                      value={pdvTicketRef}
                      onChange={e => setPdvTicketRef(e.target.value)}
                      placeholder="Ex: 12345"
                      disabled={!shift || operatorBlocked}
                    />
                    <Input
                      label="Observacao"
                      value={pdvNote}
                      onChange={e => setPdvNote(e.target.value)}
                      placeholder="Opcional"
                      disabled={!shift || operatorBlocked}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Painel Lateral - Resumo */}
            <div className="space-y-4">
              {/* Status Turno */}
              <Card className={shift ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-600"}>
                {shift ? (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-400">Turno Aberto</p>
                      <p className="text-xs text-muted">{booths.find(b => b.booth_id === shift.booth_id)?.booth_name || "Guiche"}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted mb-3">Selecione um guiche para abrir turno:</p>
                    <Select
                      value={boothId}
                      onChange={e => setBoothId(e.target.value)}
                      disabled={operatorBlocked}
                      className="mb-3"
                    >
                      <option value="">Selecione guiche</option>
                      {booths.map(b => <option key={b.booth_id} value={b.booth_id}>{b.booth_name}</option>)}
                    </Select>
                    <Button variant="success" onClick={openShift} disabled={operatorBlocked || !boothId} className="w-full">
                      Abrir Turno
                    </Button>
                  </div>
                )}
              </Card>

              {/* KPIs Resumo */}
              <Card>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-4">Resumo do Turno</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Banknote size={16} className="text-emerald-400" /> Dinheiro</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(totals.cash)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Smartphone size={16} className="text-cyan-400" /> PIX</span>
                    <span className="font-bold text-cyan-400">{formatCurrency(totals.pix)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><CreditCard size={16} className="text-purple-400" /> Credito</span>
                    <span className="font-bold text-purple-400">{formatCurrency(totals.credit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
                    <span className="text-sm text-muted flex items-center gap-2"><Wallet size={16} className="text-blue-400" /> Debito</span>
                    <span className="font-bold text-blue-400">{formatCurrency(totals.debit)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-t-2 border-primary">
                    <span className="text-sm font-semibold text-foreground">Total Geral</span>
                    <span className="font-bold text-xl text-foreground">{formatCurrency(totalGeral)}</span>
                  </div>
                </div>
              </Card>

              {/* Acoes Rapidas */}
              <Card>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-3">Acoes Rapidas</h3>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start" 
                    onClick={() => setSection("historico")}
                  >
                    <ChevronRight size={16} className="mr-2" />
                    Ver Historico Completo
                  </Button>
                  {shift && (
                    <Button 
                      variant="danger" 
                      className="w-full" 
                      onClick={openCloseShiftModal}
                      disabled={operatorBlocked}
                    >
                      Encerrar Turno
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Ultimas Vendas */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Ultimas Vendas</h3>
              <Badge variant="secondary">{txs.length} hoje</Badge>
            </div>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => tx.company_name },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
                { key: "comp", header: "Comprovante", render: (tx) => tx.receipt_count > 0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : <span className="text-muted">-</span> },
              ]}
              rows={txs.slice(0, 8)}
              emptyMessage="Nenhuma venda registrada."
            />
          </Card>
        </div>
      )}

      {/* ===== HISTORICO ===== */}
      {show("historico") && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historico de Lancamentos</h1>
            <p className="text-sm text-muted">Todos os lancamentos do turno atual</p>
          </div>

          {/* Comprovantes Pendentes */}
          {pendingReceiptTxs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-warning" size={20} />
                <h3 className="font-semibold text-warning">Comprovantes Pendentes ({pendingReceiptTxs.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingReceiptTxs.slice(0,8).map(tx=>(
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tx.company_name} - {formatCurrency(Number(tx.amount))}</p>
                      <p className="text-xs text-muted">{tx.payment_method.toUpperCase()} - {isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--"}</p>
                    </div>
                    <label className="cursor-pointer">
                      <Button variant="secondary" size="sm">
                        {uploadingTxId===tx.id ? "Enviando..." : "Anexar"}
                      </Button>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingTxId===tx.id||operatorBlocked} onChange={e=>handleUploadReceipt(tx.id,e)} />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tabela de Lancamentos */}
          <Card>
            <DataTable
              columns={[
                { key: "hora", header: "Hora", render: (tx) => isMounted ? new Date(tx.sold_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--" },
                { key: "empresa", header: "Empresa", render: (tx) => <span className="font-semibold">{tx.company_name}</span> },
                { key: "metodo", header: "Metodo", render: (tx) => <PaymentBadge method={tx.payment_method} /> },
                { key: "valor", header: "Valor", render: (tx) => <span className="font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span> },
                { key: "comprovante", header: "Comprovante", render: (tx) => tx.receipt_count>0 ? <Badge variant="success">OK</Badge> : (tx.payment_method==="credit"||tx.payment_method==="debit") ? <Badge variant="warning">PENDENTE</Badge> : <span className="text-muted">-</span> },
              ]}
              rows={txs}
              emptyMessage="Sem lancamentos neste turno."
            />
          </Card>

          {/* Form Novo Lancamento */}
          <Card>
            <h3 className="font-semibold text-foreground mb-4">Novo Lancamento</h3>
            <form onSubmit={submitTx} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="">Selecione</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Forma de pagamento</label>
                <div className="flex gap-2">
                  {(["pix","credit","debit","cash"] as const).map(m=>(
                    <Button
                      key={m}
                      type="button"
                      variant={paymentMethod===m?"primary":"secondary"}
                      size="sm"
                      className="flex-1"
                      onClick={()=>setPaymentMethod(m)}
                    >
                      {m==="pix"?"PIX":m==="credit"?"Credito":m==="debit"?"Debito":"Dinheiro"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <Button type="submit" variant="primary" disabled={!shift||operatorBlocked} className="w-full">
                Registrar Lancamento
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ===== PONTO DIGITAL ===== */}
      {show("ponto") && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ponto Digital</h1>
            <p className="text-sm text-muted">Registre sua entrada, saida e pausas</p>
          </div>

          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["entrada","pausa_inicio","pausa_fim","saida"] as const).map(t=>(
                <Button
                  key={t}
                  variant={t==="entrada"?"success":t==="saida"?"danger":"secondary"}
                  disabled={operatorBlocked}
                  onClick={()=>registerPunch(t)}
                  className="py-6"
                >
                  <Clock size={20} className="mr-2" />
                  {t==="entrada"?"Entrada":t==="pausa_inicio"?"Inicio Pausa":t==="pausa_fim"?"Fim Pausa":"Saida"}
                </Button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-foreground mb-4">Registros de Ponto</h3>
            <DataTable
              columns={[
                { key: "tipo", header: "Tipo", render: (p) => (
                  <Badge variant={p.punch_type === "entrada" ? "success" : p.punch_type === "saida" ? "warning" : "secondary"}>
                    {p.punch_type.toUpperCase().replace("_"," ")}
                  </Badge>
                ) },
                { key: "hora", header: "Data/Hora", render: (p) => isMounted ? new Date(p.punched_at).toLocaleString("pt-BR") : "--" },
                { key: "obs", header: "Observacao", render: (p) => p.note || "-" },
              ]}
              rows={punches}
              emptyMessage="Nenhum registro de ponto."
            />
          </Card>
        </div>
      )}

      {/* ===== CONFIGURACOES ===== */}
      {show("configuracoes") && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
            <p className="text-sm text-muted">Preferencias do operador</p>
          </div>
          <Card>
            <p className="text-muted">Em breve: configuracoes do operador.</p>
          </Card>
        </div>
      )}

      {/* Modal Fechamento */}
      {showCloseModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Fechamento de Caixa</h2>
            <div className="space-y-4">
              <div className="bg-success/10 p-4 rounded-lg flex justify-between items-center border border-success/20">
                <span className="text-sm text-muted">Valor Esperado Gaveta</span>
                <span className="text-success font-bold">{formatCurrency(expectedCashVal)}</span>
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

      {/* Modal Suprimento/Sangria */}
      {showCashModal && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {cashModalType === "suprimento" ? "Novo Suprimento" : "Nova Sangria"}
            </h2>
            <form onSubmit={submitCashMovement} className="space-y-4">
              <Input
                label="Valor (R$)"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                required
              />
              <Input
                label="Observacao (Opcional)"
                value={cashNote}
                onChange={e => setCashNote(e.target.value)}
                placeholder="Motivo ou descricao"
              />
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowCashModal(false)}>Cancelar</Button>
                <Button type="submit" variant={cashModalType === "suprimento" ? "success" : "danger"}>
                  Confirmar {cashModalType === "suprimento" ? "Suprimento" : "Sangria"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Confirmacao Venda PDV */}
      {showPdvConfirm && shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-foreground mb-4">Confirmar Venda</h2>
            <div className="space-y-4">
              <div className="bg-slate-800 p-6 rounded-lg text-center">
                <p className="text-sm text-muted mb-1">Valor Total</p>
                <p className="text-4xl font-bold text-emerald-400">{formatCurrency(parseFloat(pdvDisplay))}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-muted text-xs">Empresa</p>
                  <p className="font-semibold text-foreground">{companies.find(c => c.id === pdvCompanyId)?.name || "-"}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-muted text-xs">Pagamento</p>
                  <p className="font-semibold text-foreground capitalize">{pdvPaymentMethod === "cash" ? "Dinheiro" : pdvPaymentMethod === "link" ? "Link Pag." : pdvPaymentMethod.toUpperCase()}</p>
                </div>
              </div>
              {pdvTicketRef && (
                <div className="bg-slate-800/50 p-3 rounded-lg text-sm">
                  <p className="text-muted text-xs">Referencia</p>
                  <p className="font-semibold text-foreground">{pdvTicketRef}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowPdvConfirm(false)}>Cancelar</Button>
              <Button type="button" variant="success" onClick={pdvSubmitSale}>
                <Check size={16} className="mr-1" />
                Confirmar Venda
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Configuracao Taxa Embarque */}
      {showTaxaConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Configurar Taxas de Embarque</h2>
              <button onClick={() => { setShowTaxaConfig(false); setEditingTaxa(null); }} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {taxasEmbarque.map(taxa => (
                <div key={taxa.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  {editingTaxa?.id === taxa.id ? (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={taxaEditNome}
                        onChange={e => setTaxaEditNome(e.target.value)}
                        placeholder="Nome"
                      />
                      <Input
                        value={taxaEditValor}
                        onChange={e => setTaxaEditValor(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-foreground">{taxa.nome}</p>
                        <p className="text-sm text-muted">{formatCurrency(taxa.valor)}</p>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 ml-3">
                    {editingTaxa?.id === taxa.id ? (
                      <>
                        <Button size="sm" variant="success" onClick={saveTaxaEdit}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTaxa(null)}><X size={14} /></Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { 
                          setEditingTaxa(taxa); 
                          setTaxaEditNome(taxa.nome); 
                          setTaxaEditValor(taxa.valor.toString()); 
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-muted">As taxas sao salvas localmente. Para alteracoes permanentes, contate o administrador.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Chat com Admin */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Chat com Administrador</h2>
                  <p className="text-xs text-muted">Envie mensagens para a central</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={48} className="mx-auto text-muted mb-3 opacity-50" />
                  <p className="text-muted">Nenhuma mensagem ainda.</p>
                  <p className="text-xs text-muted">Envie uma mensagem para o administrador.</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-foreground">{msg.message}</p>
                    <p className="text-xs text-muted mt-1">
                      {isMounted ? new Date(msg.created_at).toLocaleString("pt-BR") : "--"}
                      {!msg.read && <span className="ml-2 text-amber-400">(Nao lida)</span>}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Input Mensagem */}
            <div className="flex gap-2 pt-4 border-t border-slate-700">
              <Input
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              />
              <Button variant="primary" onClick={sendChatMessage} disabled={!newChatMessage.trim()}>
                <Send size={16} />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </RebuildShell>
  );
}
