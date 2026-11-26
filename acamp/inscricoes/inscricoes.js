import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const URL_API="https://pmbzwbbofczahnckgjcq.supabase.co";
const PUBLIC_KEY="sb_publishable_N-BCEx_6Rqozppa8rrhKJQ_2dJMcKuu";
const form=document.querySelector("#registration-form");
const steps=[...document.querySelectorAll(".wizard-step")];
const $=s=>document.querySelector(s);
let step=1;
let lastCarnet=null;
const val=n=>form.elements[n]?.value??"";
const chosen=n=>form.querySelector('[name="'+n+'"]:checked')?.value??"";
const digits=s=>String(s||"").replace(/\D/g,"");
const text=s=>String(s||"").trim();
function error(message){$("#form-error").textContent=message||"";$("#form-error").hidden=!message;}
function validCpf(raw){const c=digits(raw);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;const calc=(base,f)=>{let sum=0;for(const n of base)sum+=Number(n)*f--;const r=(sum*10)%11;return r===10?0:r;};return calc(c.slice(0,9),10)===Number(c[9])&&calc(c.slice(0,10),11)===Number(c[10]);}
function showStep(n){step=n;steps.forEach(p=>p.hidden=Number(p.dataset.step)!==n);$("#back-button").hidden=n===1;$("#next-button").hidden=n===4;$("#submit-button").hidden=n!==4;$("#test-pix-button").hidden=n!==4;$("#progress-bar").style.width=(n*25)+"%";$("#progress-label").textContent="ETAPA 0"+n+" DE 04";error("");$("#registration-panel").scrollIntoView({behavior:"smooth",block:"start"});}
function showIf(id,yes){$(id).hidden=!yes;}
function updateGreeting(){const first=text(val("nome_completo")).split(/\s+/)[0]||"você";$("#greeting-name").textContent="Olá, "+first+"!";$("#greeting-ready").textContent=chosen("genero")==="F"?"Pronta":chosen("genero")==="M"?"Pronto":"Pronto(a)";}
function updateReligious(){const ev=chosen("evangelico");showIf("#evangelical-fields",ev==="sim");showIf("#religion-fields",ev==="nao");const church=chosen("igreja_tipo");showIf("#lagoinha-fields",ev==="sim"&&church==="lagoinha");showIf("#other-church-field",ev==="sim"&&church==="outra_igreja");showIf("#other-lagoinha-field",ev==="sim"&&church==="lagoinha"&&chosen("igreja_unidade")==="outra_lagoinha");showIf("#religion-other-field",ev==="nao"&&chosen("religiao")==="outra");}
function updatePayment(){const chosenMethod=chosen("metodo_pagamento"),carne=chosenMethod==="carne";showIf("#installment-options",carne);showIf("#checkout-method-note",chosenMethod==="pix");$("#installment-count").required=carne;$("#first-due-date").required=carne;}
function required(n,msg){if(!text(val(n)))throw new Error(msg);}
function validate(n){
 if(n===1&&!chosen("genero"))throw new Error("Selecione uma opção de gênero.");
 if(n===2){required("nome_completo","Informe seu nome completo.");if(text(val("nome_completo")).length<3)throw new Error("Informe seu nome completo.");required("data_nascimento","Informe sua data de nascimento.");if(val("data_nascimento")>=today())throw new Error("A data de nascimento deve estar no passado.");if(!validCpf(val("cpf")))throw new Error("Confira o CPF informado.");if(digits(val("telefone")).length<10)throw new Error("Informe um telefone com DDD.");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email").trim()))throw new Error("Informe um e-mail válido.");}
 if(n===3){const ev=chosen("evangelico");if(!ev)throw new Error("Responda se você é evangélico(a).");if(ev==="sim"){if(!chosen("igreja_tipo"))throw new Error("Informe se é da Lagoinha ou de outra igreja.");if(chosen("igreja_tipo")==="lagoinha"){if(!chosen("igreja_unidade"))throw new Error("Informe qual unidade da Lagoinha.");if(chosen("igreja_unidade")==="outra_lagoinha")required("igreja_nome_lagoinha","Informe qual Lagoinha você frequenta.");}if(chosen("igreja_tipo")==="outra_igreja")required("igreja_nome_outra","Informe o nome da sua igreja.");}else{if(!chosen("religiao"))throw new Error("Selecione sua religião.");if(chosen("religiao")==="outra")required("religiao_outra","Digite sua religião.");}}
 if(n===4){const m=chosen("metodo_pagamento");if(!m)throw new Error("Selecione uma forma de pagamento.");if(m==="carne"){if(!val("parcelas"))throw new Error("Escolha a quantidade de parcelas.");if(!val("primeiro_vencimento")||val("primeiro_vencimento")<today())throw new Error("Escolha uma data válida para o primeiro vencimento.");}if(!form.elements.consentimento_privacidade.checked)throw new Error("Confirme a leitura da Política de Privacidade.");if(!form.elements.consentimento_dados_sensiveis.checked)throw new Error("Confirme a autorização para o tratamento da informação religiosa.");}
}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function payload(){const ev=chosen("evangelico")==="sim";const church=chosen("igreja_tipo");const unit=chosen("igreja_unidade");return {action:"register",redirect_url:location.origin+location.pathname+"?payment_return=1",genero:chosen("genero"),nome_completo:text(val("nome_completo")),data_nascimento:val("data_nascimento"),cpf:digits(val("cpf")),telefone:digits(val("telefone")),email:val("email").trim().toLowerCase(),is_evangelico:ev,igreja_tipo:ev?church:null,igreja_unidade:ev&&church==="lagoinha"?unit:null,igreja_nome:ev?(church==="outra_igreja"?val("igreja_nome_outra"):unit==="outra_lagoinha"?val("igreja_nome_lagoinha"):null):null,religiao:ev?null:chosen("religiao"),religiao_outra:!ev&&chosen("religiao")==="outra"?val("religiao_outra"):null,metodo_pagamento:chosen("metodo_pagamento"),parcelas:chosen("metodo_pagamento")==="carne"?Number(val("parcelas")):1,primeiro_vencimento:val("primeiro_vencimento")||null,consentimento_privacidade:form.elements.consentimento_privacidade.checked,consentimento_dados_sensiveis:form.elements.consentimento_dados_sensiveis.checked};}
async function apiCall(body){const res=await fetch(URL_API+"/functions/v1/acamp-api",{method:"POST",headers:{"Content-Type":"application/json",apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok||data.error)throw new Error(data.error||"Não foi possível concluir a inscrição.");return data;}
function currency(c){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(c/100);}
function months(date,n){const [y,m,d]=date.split("-").map(Number);const first=new Date(y,m-1+n,1);const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();return new Date(first.getFullYear(),first.getMonth(),Math.min(d,last)).toLocaleDateString("pt-BR");}
function makePdf(result,p){const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error("Não foi possível carregar o gerador de PDF.");const doc=new JsPDF({unit:"mm",format:"a4"});(result.parcelas||[]).forEach((part,i)=>{if(i)doc.addPage();doc.setFillColor(25,28,25);doc.rect(0,0,210,48,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("LEGACY / ACAMP 2027",18,17);doc.setFontSize(23);doc.text("CARNÊ DE INSCRIÇÃO",18,32);doc.setTextColor(35,38,34);doc.setFontSize(16);doc.text("PARCELA "+part.numero+" DE "+result.parcelas.length,18,67);const rows=[["Participante",p.nome_completo],["CPF",p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4")],["Telefone",p.telefone],["E-mail",p.email],["Código",result.inscription.codigo_ingresso],["Valor total",currency(result.inscription.valor_total_centavos)],["Valor da parcela",currency(part.valor_centavos)],["Vencimento",months(p.primeiro_vencimento,i)],["Situação","PENDENTE"]];let y=86;doc.setFontSize(11);rows.forEach(([k,v])=>{doc.setFont("helvetica","bold");doc.text(k+":",18,y);doc.setFont("helvetica","normal");doc.text(String(v),76,y);y+=11;});doc.setDrawColor(180,180,180);doc.line(18,188,192,188);doc.setFontSize(9);doc.setTextColor(95,95,95);doc.text("A confirmação do pagamento deve ser realizada pela equipe organizadora.",18,198);doc.setFont("helvetica","bold");doc.setTextColor(170,42,43);doc.text("ACAMP 2027 · 06 A 08 DE FEVEREIRO",18,274);});const name=p.nome_completo.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase();const blob=doc.output("blob");const fileUrl=URL.createObjectURL(blob);const link=document.createElement("a");link.href=fileUrl;link.download="carne-acamp27-"+name+".pdf";link.style.position="fixed";link.style.left="-9999px";document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(fileUrl),1500);}
function success(result,p){
 form.hidden=true;
 $(".wizard-progress").hidden=true;
 $("#wizard-success").hidden=false;
 $("#success-code-value").textContent=result.inscription.codigo_ingresso;
 if(result.method==="carne"){
  $("#success-message").textContent="Sua inscrição foi registrada. O carnê tem uma página para cada parcela. Baixe o PDF pelo botão abaixo e consulte os pagamentos quando quiser.";
  $("#download-pdf").hidden=false;
  lastCarnet=()=>makePdf(result,p);
 }else{
  $("#success-message").textContent="Sua inscrição foi registrada. A situação do pagamento poderá ser consultada na página Minha inscrição.";
 }
}
$("#download-pdf").addEventListener("click",()=>{
 const feedback=$("#download-feedback");
 try{
  if(!lastCarnet)throw new Error("O carnê não está disponível nesta inscrição.");
  lastCarnet();
  feedback.textContent="Download do carnê iniciado.";
  feedback.hidden=false;
 }catch(err){
  feedback.textContent=err.message||"Não foi possível gerar o PDF. Tente novamente.";
  feedback.hidden=false;
 }
});
const paymentModal=$("#payment-unavailable-modal");
$("#close-payment-modal").addEventListener("click",()=>paymentModal.close());
form.addEventListener("click",e=>{const option=e.target.closest('input[name="metodo_pagamento"]');if(option&&(option.value==="pix"||option.value==="cartao")){e.preventDefault();e.stopPropagation();paymentModal.showModal();}},true);
$("#nome-completo").addEventListener("input",updateGreeting);
form.addEventListener("change",()=>{updateReligious();updatePayment();});
$("#cpf").addEventListener("input",e=>{let v=digits(e.target.value).slice(0,11);v=v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");e.target.value=v;});
$("#telefone").addEventListener("input",e=>{let v=digits(e.target.value).slice(0,11);v=v.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d{1,4})$/,"$1-$2");e.target.value=v;});
$("#next-button").addEventListener("click",()=>{try{validate(step);if(step===1)updateGreeting();showStep(Math.min(4,step+1));}catch(e){error(e.message);}});
$("#back-button").addEventListener("click",()=>showStep(Math.max(1,step-1)));
$("#test-pix-button").addEventListener("click",async()=>{try{validate(4);error("");const testPayload={...payload(),metodo_pagamento:"pix",teste_checkout:true};const button=$("#test-pix-button");button.disabled=true;button.textContent="GERANDO TESTE...";const result=await apiCall(testPayload);if(result.checkout_url){location.assign(result.checkout_url);return;}throw new Error("O checkout de teste não retornou um link.");}catch(err){error(err.message||"Não foi possível gerar o Pix de teste.");}finally{const button=$("#test-pix-button");button.disabled=false;button.textContent="Teste · Pix R$ 1,00";}});
form.addEventListener("submit",async e=>{e.preventDefault();try{validate(4);error("");$("#submit-button").disabled=true;$("#submit-button").textContent="REGISTRANDO...";const p=payload();const result=await apiCall(p);if(result.checkout_url){location.assign(result.checkout_url);return;}success(result,p);}catch(err){error(err.message||"Ocorreu um erro ao registrar sua inscrição.");}finally{$("#submit-button").disabled=false;$("#submit-button").innerHTML='Finalizar inscrição <span>↗</span>';}});

async function paymentReturn(){const q=new URLSearchParams(location.search);if(q.get("payment_return")!=="1")return;const order=q.get("order_nsu"),transaction=q.get("transaction_nsu"),slug=q.get("slug");const box=document.createElement("div");box.className="wizard-error";box.hidden=false;if(!order||!transaction||!slug){box.textContent="Não recebemos todos os dados de confirmação. A equipe poderá conferir o pagamento pelo painel.";$("#registration-panel").prepend(box);return;}try{const result=await apiCall({action:"confirm_payment",order_nsu:order,transaction_nsu:transaction,slug,receipt_url:q.get("receipt_url")||null});box.textContent=result.paid?"Pagamento confirmado pela InfinitePay. Sua inscrição está quitada!":"Checkout retornou, mas a confirmação ainda não foi recebida. A situação será atualizada após a confirmação da InfinitePay.";}catch(err){box.textContent=err.message;}$("#registration-panel").prepend(box);history.replaceState({},"",location.pathname);}
$("#first-due-date").min=today();$("#first-due-date").value=today();paymentReturn();
