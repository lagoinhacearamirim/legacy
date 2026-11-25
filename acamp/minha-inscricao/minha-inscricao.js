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
 return ({paga:"Paga",pago:"Pago",pendente:"Pendente",aguardando:"Aguardando pagamento",cancelada:"Cancelada",cancelado:"Cancelado",estornado:"Estornado",falhou:"Não confirmado"})[status]||"Pendente";
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
  addCell(row,"Pagamento único");
  addCell(row,"—");
  addCell(row,currency(inscription.valor_total_centavos));
  const statusCell=addCell(row,"");
  const badge=document.createElement("span");
  badge.className="lookup-payment-status"+(payment.status==="pago"?" is-paid":"");
  badge.textContent=statusName(payment.status);
  statusCell.appendChild(badge);
  addCell(row,date(payment.paid_at));
  body.appendChild(row);
 }
 $("#lookup-results").hidden=false;
}

async function callLookup(cpf){
 const response=await fetch(API_URL+"/functions/v1/acamp-api",{
  method:"POST",
  headers:{"Content-Type":"application/json",apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY},
  body:JSON.stringify({action:"lookup_registration",cpf})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)throw new Error(data.error||"Não foi possível consultar sua inscrição.");
 return data;
}

$("#lookup-cpf").addEventListener("input",event=>{
 let value=digits(event.target.value).slice(0,11);
 value=value.replace(/(\d{3})(\d)/,"$1.$2")
  .replace(/(\d{3})(\d)/,"$1.$2")
  .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
 event.target.value=value;
});
$("#lookup-form").addEventListener("submit",async event=>{
 event.preventDefault();
 $("#lookup-results").hidden=true;
 showMessage("");
 const cpf=digits($("#lookup-cpf").value);
 if(!validCpf(cpf)){
  showMessage("Confira o CPF informado e tente novamente.");
  $("#lookup-cpf").focus();
  return;
 }
 const button=$("#lookup-submit");
 button.disabled=true;
 button.innerHTML="CONSULTANDO...";
 try{
  const result=await callLookup(cpf);
  if(!result.found){
   showMessage("Não encontramos uma inscrição vinculada a esse CPF. Confira os números digitados ou entre em contato com a equipe do Acamp.");
   return;
  }
  renderResult(result);
 }catch(error){
  showMessage(error.message||"Não foi possível consultar sua inscrição. Tente novamente.");
 }finally{
  button.disabled=false;
  button.innerHTML='Consultar inscrição <span>↗</span>';
 }
});