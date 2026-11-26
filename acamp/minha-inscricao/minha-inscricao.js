const API_URL="https://pmbzwbbofczahnckgjcq.supabase.co";
const PUBLIC_KEY="sb_publishable_N-BCEx_6Rqozppa8rrhKJQ_2dJMcKuu";
const $=selector=>document.querySelector(selector);
const digits=value=>String(value||"").replace(/\D/g,"");

function validCpf(raw){
 const cpf=digits(raw);
 if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
 const calc=(base,factor)=>{
  let sum=0;
  for(const digit of base)sum+=Number(digit)*factor--;
  const rest=(sum*10)%11;
  return rest===10?0:rest;
 };
 return calc(cpf.slice(0,9),10)===Number(cpf[9])&&calc(cpf.slice(0,10),11)===Number(cpf[10]);
}
function currency(cents){
 return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(cents)||0)/100);
}
function date(value){
 if(!value)return "—";
 const raw=String(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
  const [year,month,day]=raw.split("-").map(Number);
  return new Date(year,month-1,day).toLocaleDateString("pt-BR");
 }
 return new Date(raw).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
}
function methodName(value){
 return ({pix:"Pix",cartao:"Cartão",especie:"Espécie",carne:"Carnê"})[value]||"Pagamento";
}
function statusName(status){
 return ({paga:"Paga",pago:"Pago",pendente:"Pendente",aguardando:"Aguardando pagamento",cancelada:"Cancelada",cancelado:"Cancelado",estornado:"Estornado",falhou:"Não confirmado",parcial:"Pagamento parcial"})[status]||"Pendente";
}
function showMessage(message,isError=true){
 const node=$("#lookup-message");
 node.textContent=message;
 node.hidden=!message;
 node.classList.toggle("lookup-error",isError);
}
function addCell(row,value,className){
 const cell=document.createElement("td");
 cell.textContent=value??"—";
 if(className)cell.className=className;
 row.appendChild(cell);
 return cell;
}
function renderResult(data){
 const inscription=data.inscricao;
 const summary=data.resumo||{total:0,pagas:0,pendentes:0};
 const isCarnet=inscription.metodo_pagamento==="carne";
 const firstName=String(inscription.nome_completo||"participante").trim().split(/\s+/)[0];
 $("#participant-first-name").textContent=firstName;
 $("#participant-name").textContent=inscription.nome_completo||"—";
 $("#registration-code").textContent=inscription.codigo_ingresso||"—";
 $("#registration-method").textContent=methodName(inscription.metodo_pagamento);
 $("#registration-total").textContent=currency(inscription.valor_total_centavos);
 $("#registration-date").textContent=date(inscription.created_at);
 $("#paid-count").textContent=String(summary.pagas??0);
 $("#pending-count").textContent=String(summary.pendentes??0);
 $("#total-count").textContent=String(summary.total??0);
 $("#paid-label").textContent=isCarnet?"Parcelas pagas":"Pagamentos confirmados";
 $("#pending-label").textContent=isCarnet?"Parcelas em aberto":"Pagamentos pendentes";
 $("#total-label").textContent=isCarnet?"Total de parcelas":"Total de cobranças";
 $("#installments-title").textContent=isCarnet?"Detalhamento do carnê":"Situação do pagamento";

 const allPaid=Number(summary.total)>0&&Number(summary.pagas)===Number(summary.total);
 const cancelled=Number(summary.canceladas||0);
 const overall=$("#overall-status");
 overall.textContent=allPaid?"PAGAMENTO QUITADO":cancelled?"PAGAMENTO PARCIAL / CANCELADO":"PAGAMENTO EM ABERTO";
 overall.classList.toggle("is-paid",allPaid);

 const body=$("#installments-body");
 body.replaceChildren();
 if(isCarnet){
  (data.parcelas||[]).forEach(part=>{
   const row=document.createElement("tr");
   addCell(row,part.numero+"ª parcela");
   addCell(row,date(part.vencimento));
   addCell(row,currency(part.valor_centavos));
   const statusCell=addCell(row,"");
   const badge=document.createElement("span");
   badge.className="lookup-payment-status"+(part.status==="paga"?" is-paid":"");
   badge.textContent=statusName(part.status);
   statusCell.appendChild(badge);
   addCell(row,date(part.pago_at));
   body.appendChild(row);
  });
 }else{
  const payment=data.pagamento||{};
  const row=document.createElement("tr");
  addCell(row,data.pagamento?.status==="parcial"?"Saldo pendente":"Pagamento único");
  addCell(row,"—");
  addCell(row,currency(data.pagamento?.status==="parcial"?data.pagamento.remaining_centavos:inscription.valor_total_centavos));
  const statusCell=addCell(row,"");
  const badge=document.createElement("span");
  badge.className="lookup-payment-status"+(payment.status==="pago"?" is-paid":"");
  badge.textContent=statusName(payment.status);
  statusCell.appendChild(badge);
  addCell(row,date(payment.paid_at));
  body.appendChild(row);
 }
 $("#lookup-results").hidden=false;
 renderOnlinePayment(data);
}

function showOnlinePaymentMessage(message,isError=false){
 const node=$("#online-payment-message");node.textContent=message;node.hidden=!message;node.classList.toggle("is-error",isError);
}
function renderOnlinePayment(data){
 const box=$("#online-payment"),inscription=data.inscricao,summary=data.resumo||{};
 const pending=Number(summary.pendentes||0);
 if(!pending||inscription.status==="pago"){box.hidden=true;return;}
 box.hidden=false;$("#online-pay-options").hidden=true;showOnlinePaymentMessage("");
 const options=[];
 if(inscription.metodo_pagamento==="carne"){
  const parts=(data.parcelas||[]).filter(p=>p.status==="pendente");
  const one=parts.slice(0,1).reduce((sum,p)=>sum+Number(p.valor_centavos),0);
  const full=parts.reduce((sum,p)=>sum+Number(p.valor_centavos),0);
  if(parts.length===1)options.push({option:"one",label:"Pagar última parcela",amount:one});
  else{
   options.push({option:"one",label:"Pagar uma parcela",amount:one});
   if(parts.length>=3)options.push({option:"two",label:"Pagar duas parcelas",amount:parts.slice(0,2).reduce((sum,p)=>sum+Number(p.valor_centavos),0)});
   options.push({option:"full",label:"Pagar integralmente",amount:full});
  }
 }else{
  options.push({option:"full",label:"Pagar integralmente",amount:Number(data.pagamento?.remaining_centavos??inscription.valor_total_centavos??0)});
 }
 $("#payment-options").innerHTML=options.map(o=>'<button type="button" class="payment-option-button" data-pay-option="'+o.option+'"><span>'+o.label+'</span><strong>'+currency(o.amount)+'</strong></button>').join("");
}
async function startOnlinePayment(option,button){
 const cpf=digits($("#lookup-cpf").value);
 if(cpf.length!==11){showOnlinePaymentMessage("Consulte novamente sua inscrição antes de iniciar o pagamento.",true);return;}
 const buttons=[...document.querySelectorAll("[data-pay-option]")];
 buttons.forEach(b=>b.disabled=true);button.textContent="Preparando pagamento...";
 showOnlinePaymentMessage("Estamos gerando seu checkout seguro na InfinitePay. Aguarde.");
 try{
  sessionStorage.setItem("acamp_online_payment_cpf",cpf);
  const result=await apiCall({action:"create_online_payment",cpf,payment_option:option});
  if(!result.checkout_url)throw new Error("A InfinitePay não retornou o link de pagamento.");
  location.assign(result.checkout_url);
 }catch(error){
  showOnlinePaymentMessage(error.message||"Não foi possível preparar o pagamento. Tente novamente.",true);
  buttons.forEach(b=>b.disabled=false);
  button.innerHTML=button.dataset.originalLabel||button.textContent;
 }
}

async function apiCall(body){
 const response=await fetch(API_URL+"/functions/v1/acamp-api",{method:"POST",headers:{"Content-Type":"application/json",apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)throw new Error(data.error||"Não foi possível realizar a solicitação.");
 return data;
}
async function callLookup(cpf){return await apiCall({action:"lookup_registration",cpf});}

$("#lookup-cpf").addEventListener("input",event=>{
 let value=digits(event.target.value).slice(0,11);
 value=value.replace(/(\d{3})(\d)/,"$1.$2")
  .replace(/(\d{3})(\d)/,"$1.$2")
  .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
 event.target.value=value;
});
async function performLookup(cpf){
 $("#lookup-results").hidden=true;$("#online-payment").hidden=true;showMessage("");
 if(!validCpf(cpf)){showMessage("Confira o CPF informado e tente novamente.");return;}
 const button=$("#lookup-submit");button.disabled=true;button.innerHTML="CONSULTANDO...";
 try{
  const result=await callLookup(cpf);
  if(!result.found){showMessage("Não encontramos uma inscrição vinculada a esse CPF. Confira os números digitados ou entre em contato com a equipe do Acamp.");return;}
  renderResult(result);
 }catch(error){showMessage(error.message||"Não foi possível consultar sua inscrição. Tente novamente.");}
 finally{button.disabled=false;button.innerHTML='Consultar inscrição <span>↗</span>';}
}
$("#lookup-form").addEventListener("submit",async event=>{event.preventDefault();await performLookup(digits($("#lookup-cpf").value));});
$("#online-pay-toggle").addEventListener("click",()=>{$("#online-pay-options").hidden=!$("#online-pay-options").hidden;});
$("#payment-options").addEventListener("click",event=>{
 const button=event.target.closest("[data-pay-option]");if(!button)return;
 button.dataset.originalLabel=button.innerHTML;startOnlinePayment(button.dataset.payOption,button);
});
async function paymentReturn(){
 const query=new URLSearchParams(location.search);if(query.get("payment_return")!=="1")return;
 const order=query.get("order_nsu"),transaction=query.get("transaction_nsu"),slug=query.get("slug");
 const cpf=sessionStorage.getItem("acamp_online_payment_cpf")||"";
 let returnMessage="",returnError=false;
 try{
  if(!order||!transaction||!slug)throw new Error("Não recebemos todos os dados de retorno da InfinitePay. Consulte sua inscrição novamente.");
  const result=await apiCall({action:"confirm_payment",order_nsu:order,transaction_nsu:transaction,slug,receipt_url:query.get("receipt_url")||null});
  returnMessage=result.paid?"Pagamento confirmado pela InfinitePay. Sua inscrição foi atualizada.":"O pagamento ainda não foi confirmado pela operadora. Consulte novamente em instantes.";
 }catch(error){returnMessage=error.message||"Não foi possível confirmar o pagamento.";returnError=true;}
 finally{
  history.replaceState({},"",location.pathname);
  sessionStorage.removeItem("acamp_online_payment_cpf");
  if(cpf){$("#lookup-cpf").value=cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4");await performLookup(cpf);}
  showMessage(returnMessage,returnError);
 }
}
paymentReturn();