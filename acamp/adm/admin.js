import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const API="https://pmbzwbbofczahnckgjcq.supabase.co",KEY="sb_publishable_N-BCEx_6Rqozppa8rrhKJQ_2dJMcKuu";
const sb=createClient(API,KEY),$=s=>document.querySelector(s);let rows=[],method="all",status="all",charts={},excludedPairs=new Set(),duplicateGroups=[],activeMergeGroup=null;
function alertMsg(msg,login=false){const el=login?$("#login-error"):$("#admin-alert");el.textContent=msg||"";el.hidden=!msg;}
function money(c){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((Number(c)||0)/100);}
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"");}
function escape(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function group(m){return m==="especie"?"especie":m==="carne"?"carne":"digital";}
function summary(r){if(r.metodo_pagamento==="carne"){const p=r.inscricao_parcelas||[],pending=p.filter(x=>x.status==="pendente").length,paidCount=p.filter(x=>x.status==="paga").length;return{paid:p.length>0&&pending===0,pending,paidCount,total:p.length,label:pending===0&&p.length?"Quitado":pending+" parcela(s) pendente(s)"};}const paid=(r.pagamentos||[]).some(p=>p.status==="pago");return{paid,pending:paid?0:1,paidCount:paid?1:0,total:1,label:paid?"Quitado":"Pendente"};}
function filtered(){const q=norm($("#search-name").value);return rows.filter(r=>{if(q&&!norm(r.nome_completo).includes(q))return false;if(method!=="all"&&group(r.metodo_pagamento)!==method)return false;const s=summary(r);if(status==="paid"&&!s.paid)return false;if(status==="pending"&&s.paid)return false;if(status.startsWith("parts-")&&(r.metodo_pagamento!=="carne"||s.pending!==Number(status.split("-")[1])))return false;return true;});}
function methodName(m){return({pix:"Pix",cartao:"Cartão",especie:"Espécie",carne:"Carnê"})[m]||m;}
function date(s){return s?new Date(s+(s.length===10?"T00:00:00":"")).toLocaleDateString("pt-BR"):"—";}
function drawList(){
 if(method==="duplicates"){
  $("#registration-list").hidden=true;$("#duplicate-groups").hidden=false;
  duplicateGroups=findDuplicateGroups();
  $("#list-count").textContent=duplicateGroups.length+" grupo(s) de possíveis duplicatas";
  $("#empty-list").hidden=duplicateGroups.length>0;
  renderDuplicateGroups();
  return;
 }
 $("#registration-list").hidden=false;$("#duplicate-groups").hidden=true;
 const list=filtered();$("#list-count").textContent=list.length+" de "+rows.length+" inscrições";$("#empty-list").hidden=list.length>0;
 $("#registration-list").innerHTML=list.map(r=>{const s=summary(r),parts=r.inscricao_parcelas||[],payments=r.pagamentos||[];let details="";
 if(r.metodo_pagamento==="carne"){details=parts.slice().sort((a,b)=>a.numero-b.numero).map(p=>'<div class="installment-row"><span>'+p.numero+"ª · "+money(p.valor_centavos)+" · "+date(p.vencimento)+" · "+(p.status==="paga"?"Paga":"Pendente")+'</span>'+(p.status==="pendente"?'<button data-parcela="'+p.id+'">Marcar paga</button>':"")+"</div>").join("");}
 else if(r.metodo_pagamento==="especie"&&!s.paid){const p=payments.find(x=>x.metodo_pagamento==="especie"&&x.status==="aguardando");if(p)details='<button class="cash-paid-button" data-cash="'+p.id+'">Marcar como recebido</button>';}
 const contact='<div class="participant-contact"><span>'+escape(r.telefone)+'</span><span>'+escape(r.email)+'</span></div>';
 return '<article class="registration-item"><div><div class="participant-name">'+escape(r.nome_completo)+'</div><span class="participant-code">'+escape(r.codigo_ingresso)+'</span></div>'+contact+'<div><div class="payment-method">'+methodName(r.metodo_pagamento)+'</div><div class="installment-summary">'+money(r.valor_total_centavos)+'</div></div><div><span class="payment-status '+(s.paid?"paid":"")+'">'+s.label+'</span>'+(r.metodo_pagamento==="carne"?'<div class="installment-summary">'+s.paidCount+" de "+s.total+" parcelas pagas</div>":"")+'</div><div>'+(r.metodo_pagamento==="carne"?details:r.metodo_pagamento==="especie"?details:date(r.created_at))+'</div></article>';
 }).join("");
}
function normalized(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function normalizedPhone(value){let d=String(value||"").replace(/\D/g,"");if(d.startsWith("55")&&(d.length===12||d.length===13))d=d.slice(2);return d;}
function editSimilarity(a,b){
 if(a===b)return 1;if(!a||!b)return 0;
 const prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let current=[i];for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev.splice(0,prev.length,...current);}
 return 1-prev[b.length]/Math.max(a.length,b.length);
}
function pairKey(a,b){return [a,b].sort().join(":");}
function duplicateReason(a,b){
 const cpfA=String(a.cpf||"").replace(/\D/g,""),cpfB=String(b.cpf||"").replace(/\D/g,"");
 if(cpfA.length===11&&cpfA===cpfB)return "Mesmo CPF";
 const phoneA=normalizedPhone(a.telefone),phoneB=normalizedPhone(b.telefone);
 if(phoneA.length>=10&&phoneA===phoneB)return "Mesmo telefone";
 const emailA=String(a.email||"").trim().toLowerCase(),emailB=String(b.email||"").trim().toLowerCase();
 if(emailA&&emailA===emailB)return "Mesmo e-mail";
 const nameA=normalized(a.nome_completo),nameB=normalized(b.nome_completo);
 if(nameA.length>=9&&nameB.length>=9&&editSimilarity(nameA,nameB)>=0.88)return "Nome muito semelhante";
 return "";
}
function findDuplicateGroups(){
 const parent=rows.map((_,i)=>i),edges=[];
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j],key=pairKey(a.id,b.id);if(excludedPairs.has(key))continue;
  const reason=duplicateReason(a,b);if(reason){edges.push({a:a.id,b:b.id,reason});join(i,j);}
 }
 const buckets=new Map();edges.forEach(edge=>{const index=root(rows.findIndex(r=>r.id===edge.a));if(!buckets.has(index))buckets.set(index,{records:[],edges:[]});buckets.get(index).edges.push(edge);});
 for(const group of buckets.values()){const ids=new Set(group.edges.flatMap(e=>[e.a,e.b]));group.records=rows.filter(r=>ids.has(r.id)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));}
 return [...buckets.values()].filter(g=>g.records.length>1);
}
function renderDuplicateGroups(){
 $("#duplicate-groups").innerHTML=duplicateGroups.map((g,index)=>{
  const tags=[...new Set(g.edges.map(e=>e.reason))].map(reason=>'<span class="duplicate-reason">'+escape(reason)+'</span>').join("");
  const cards=g.records.map(r=>'<article class="duplicate-person"><div class="participant-name">'+escape(r.nome_completo)+'</div><span class="participant-code">'+escape(r.codigo_ingresso)+'</span><div class="duplicate-person-details"><span>CPF: '+escape(r.cpf||"—")+'</span><span>Telefone: '+escape(r.telefone||"—")+'</span><span>E-mail: '+escape(r.email||"—")+'</span><span>Pagamento: '+escape(methodName(r.metodo_pagamento))+' · '+money(r.valor_total_centavos)+'</span><span>Cadastro: '+date(r.created_at)+'</span></div></article>').join("");
  const actions=g.edges.map(e=>{const a=rows.find(r=>r.id===e.a),b=rows.find(r=>r.id===e.b);return '<div class="duplicate-pair-action"><span>'+escape(a?.nome_completo||"Cadastro")+' ↔ '+escape(b?.nome_completo||"Cadastro")+' · '+escape(e.reason)+'</span><button class="not-duplicate-button" data-not-duplicate-a="'+e.a+'" data-not-duplicate-b="'+e.b+'">Não é duplicata</button></div>';}).join("");
  return '<section class="duplicate-group-card"><div class="duplicate-group-heading"><div><span class="duplicate-group-number">GRUPO '+String(index+1).padStart(2,"0")+'</span><h3>'+g.records.length+' inscrições relacionadas</h3><div class="duplicate-reasons">'+tags+'</div></div><button class="admin-primary" data-merge-group="'+index+'">Mesclar inscrições</button></div><div class="duplicate-people">'+cards+'</div><div class="duplicate-pair-list">'+actions+'</div></section>';
 }).join("");
}
function openMergeDialog(index){
 activeMergeGroup=duplicateGroups[index];if(!activeMergeGroup)return;
 const records=activeMergeGroup.records;
 const optionHTML=records.map(r=>'<option value="'+r.id+'">'+escape(r.nome_completo)+' · '+escape(r.codigo_ingresso)+' · '+date(r.created_at)+'</option>').join("");
 $("#merge-primary").innerHTML=optionHTML;
 document.querySelectorAll("[data-merge-field]").forEach(select=>{
  select.innerHTML=records.map(r=>'<option value="'+r.id+'">'+escape(r.nome_completo)+' · '+escape(({nome_completo:r.nome_completo,cpf:r.cpf,telefone:r.telefone,email:r.email,metodo_pagamento:methodName(r.metodo_pagamento)})[select.dataset.mergeField]||"")+'</option>').join("");
  select.value=records[0].id;
 });
 $("#merge-dialog").showModal();
}
async function saveNotDuplicate(a,b,button){
 button.disabled=true;
 try{await call("admin_exclude_duplicate",{inscricao_a:a,inscricao_b:b});await refresh();alertMsg("Par registrado como não duplicado. Ele não será sugerido novamente.");}
 catch(err){alertMsg(err.message);button.disabled=false;}
}
async function mergeActiveGroup(){
 if(!activeMergeGroup)return;
 const primary=$("#merge-primary").value;
 const duplicateIds=activeMergeGroup.records.map(r=>r.id).filter(id=>id!==primary);
 const field_sources={};document.querySelectorAll("[data-merge-field]").forEach(select=>field_sources[select.dataset.mergeField]=select.value);
 if(!duplicateIds.length)throw new Error("Escolha ao menos uma inscrição para mesclar.");
 if(!window.confirm("Confirma a mesclagem? As inscrições duplicadas serão excluídas e os registros financeiros serão preservados."))return;
 const button=$("#merge-confirm");button.disabled=true;button.textContent="Mesclando...";
 try{await call("admin_merge_duplicates",{primary_id:primary,duplicate_ids:duplicateIds,field_sources});$("#merge-dialog").close();await refresh();alertMsg("Inscrições mescladas com sucesso. Os cadastros duplicados foram excluídos.");}
 catch(err){alertMsg(err.message);button.disabled=false;button.textContent="Mesclar e excluir duplicatas";}
 finally{if(!button.disabled)button.textContent="Mesclar e excluir duplicatas";}
}
function chart(id,type,labels,data){if(charts[id])charts[id].destroy();if(!window.Chart)return;charts[id]=new Chart(document.getElementById(id),{type,data:{labels,datasets:[{data,backgroundColor:["#b52b2c","#718064","#d5b789","#474d43","#9c9c90","#d9d6ce","#a75e4b","#8a7d6f"],borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:9,usePointStyle:true,color:"#6f7069",font:{size:10}}}},scales:type==="bar"?{y:{beginAtZero:true,ticks:{precision:0},grid:{color:"#efede7"}},x:{grid:{display:false}}}:{}}});}
function dashboard(){const paid=rows.filter(r=>summary(r).paid).length;const raised=rows.reduce((sum,r)=>sum+(r.metodo_pagamento==="carne"?(r.inscricao_parcelas||[]).filter(p=>p.status==="paga").reduce((a,p)=>a+Number(p.valor_centavos),0):summary(r).paid?Number(r.valor_total_centavos):0),0);$("#stat-total").textContent=rows.length;$("#stat-paid").textContent=paid;$("#stat-pending").textContent=rows.length-paid;$("#stat-raised").textContent=money(raised);const g={},ages={"Até 11":0,"12–17":0,"18–24":0,"25–34":0,"35–44":0,"45+":0},church={"Lagoinha Ceará-Mirim":0,"Outra Lagoinha":0,"Outra igreja":0,"Não evangélico(a)":0},religion={};rows.forEach(r=>{const gn=({M:"Masculino",F:"Feminino",Outro:"Outro","Prefiro não informar":"Não informado"})[r.genero]||"Não informado";g[gn]=(g[gn]||0)+1;const b=new Date(r.data_nascimento+"T00:00:00"),now=new Date();let age=now.getFullYear()-b.getFullYear();if(now.getMonth()<b.getMonth()||(now.getMonth()===b.getMonth()&&now.getDate()<b.getDate()))age--;ages[age<=11?"Até 11":age<=17?"12–17":age<=24?"18–24":age<=34?"25–34":age<=44?"35–44":"45+"]++;if(r.is_evangelico){const c=r.igreja_tipo==="outra_igreja"?"Outra igreja":r.igreja_unidade==="ceara_mirim"?"Lagoinha Ceará-Mirim":"Outra Lagoinha";church[c]++;religion["Evangélico(a)"]=(religion["Evangélico(a)"]||0)+1;}else{church["Não evangélico(a)"]++;const n=({catolico:"Católico(a)",espirita:"Espírita",umbanda:"Umbanda",kimbanda:"Kimbanda",candomblecista:"Candomblecista",ateu:"Ateu(ateia)",outra:r.religiao_outra||"Outra"})[r.religiao]||"Não informado";religion[n]=(religion[n]||0)+1;}});Object.keys(church).forEach(k=>{if(!church[k])delete church[k];});chart("gender-chart","doughnut",Object.keys(g),Object.values(g));chart("age-chart","bar",Object.keys(ages),Object.values(ages));chart("church-chart","doughnut",Object.keys(church),Object.values(church));chart("religion-chart","bar",Object.keys(religion).length?Object.keys(religion):["Sem respostas"],Object.keys(religion).length?Object.values(religion):[0]);}
async function call(action,extra={}){const {data}=await sb.auth.getSession(),token=data.session?.access_token;if(!token)throw new Error("Sessão expirada. Entre novamente.");const res=await fetch(API+"/functions/v1/acamp-api",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+token},body:JSON.stringify(Object.assign({action},extra))});const json=await res.json().catch(()=>({}));if(!res.ok||json.error)throw new Error(json.error||"Não foi possível realizar a operação.");return json;}
async function refresh(){const result=await call("admin_list");rows=result.inscricoes||[];excludedPairs=new Set((result.exclusoes||[]).map(x=>pairKey(x.inscricao_a,x.inscricao_b)));dashboard();drawList();}
$("#login-form").addEventListener("submit",async e=>{e.preventDefault();$("#login-button").disabled=true;alertMsg("",true);try{const {error}=await sb.auth.signInWithPassword({email:$("#login-email").value.trim().toLowerCase(),password:$("#login-password").value});if(error)throw error;$("#login-panel").hidden=true;$("#admin-app").hidden=false;$("#welcome-user").textContent="Conectado como "+$("#login-email").value.trim();await refresh();}catch(err){$("#admin-app").hidden=true;$("#login-panel").hidden=false;await sb.auth.signOut();alertMsg(err.message,true);}finally{$("#login-button").disabled=false;}});
$("#logout-button").addEventListener("click",async()=>{await sb.auth.signOut();location.reload();});
$("#show-inscriptions").addEventListener("click",()=>{$("#dashboard-view").hidden=true;$("#inscriptions-view").hidden=false;drawList();});
$("#back-dashboard").addEventListener("click",()=>{$("#dashboard-view").hidden=false;$("#inscriptions-view").hidden=true;});
$("#search-name").addEventListener("input",drawList);
$("#status-filter").addEventListener("change",e=>{status=e.target.value;drawList();});
document.querySelectorAll("[data-method]").forEach(btn=>btn.addEventListener("click",()=>{method=btn.dataset.method;document.querySelectorAll("[data-method]").forEach(b=>b.classList.toggle("active",b===btn));$("#status-filter").innerHTML=method==="carne"?' <option value="all">Todos os status</option><option value="paid">Quitado</option><option value="parts-1">1 parcela pendente</option><option value="parts-2">2 parcelas pendentes</option><option value="parts-3">3 parcelas pendentes</option>':'<option value="all">Todos os status</option><option value="paid">Quitado</option><option value="pending">Pendente</option>';status="all";drawList();}));
$("#duplicate-groups").addEventListener("click",async e=>{
 const not=e.target.closest("[data-not-duplicate-a]"),merge=e.target.closest("[data-merge-group]");
 if(not){await saveNotDuplicate(not.dataset.notDuplicateA,not.dataset.notDuplicateB,not);return;}
 if(merge)openMergeDialog(Number(merge.dataset.mergeGroup));
});
$("#merge-cancel").addEventListener("click",()=>$("#merge-dialog").close());
$("#merge-cancel-bottom").addEventListener("click",()=>$("#merge-dialog").close());
$("#merge-primary").addEventListener("change",e=>document.querySelectorAll("[data-merge-field]").forEach(select=>select.value=e.target.value));
$("#merge-form").addEventListener("submit",async e=>{e.preventDefault();try{await mergeActiveGroup();}catch(err){alertMsg(err.message);}});
$("#registration-list").addEventListener("click",async e=>{const part=e.target.closest("[data-parcela]"),cash=e.target.closest("[data-cash]"),btn=part||cash;if(!btn)return;btn.disabled=true;try{if(part)await call("admin_mark_installment_paid",{parcela_id:part.dataset.parcela});else await call("admin_mark_cash_paid",{pagamento_id:cash.dataset.cash});await refresh();alertMsg("Pagamento atualizado com sucesso.");setTimeout(()=>alertMsg(""),3500);}catch(err){alertMsg(err.message);btn.disabled=false;}});
$("#download-attendance").addEventListener("click",()=>{const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)return alertMsg("Gerador de PDF indisponível.");const doc=new JsPDF({orientation:"landscape",unit:"mm",format:"a4"});const body=rows.map(r=>{const s=summary(r);const pay=r.metodo_pagamento==="carne"?s.paidCount+"/"+s.total+" pagas · "+s.pending+" pendentes":s.paid?"QUITADO":"PENDENTE";return[r.nome_completo,r.telefone,r.email,methodName(r.metodo_pagamento),pay];});doc.setFontSize(16);doc.text("ACAMP 2027 — LISTA DE PARTICIPANTES",14,16);doc.setFontSize(8);doc.text("Emitido em "+new Date().toLocaleString("pt-BR")+" · Total: "+rows.length,14,23);if(doc.autoTable)doc.autoTable({startY:29,head:[["Participante","Telefone","E-mail","Pagamento","Situação atual"]],body,styles:{fontSize:8,cellPadding:3},headStyles:{fillColor:[35,39,35]},alternateRowStyles:{fillColor:[246,245,240]}});doc.save("acamp-2027-lista-de-participantes.pdf");});
