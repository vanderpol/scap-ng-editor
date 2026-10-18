"use strict";
/* Self-contained static browser editor. No AI, scanner, GitHub write, or backend. Refs #6 #8. */
(function(){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const settings=window.SCAPNG_DEMO_SOURCE||{repository:"vanderpol/scap-ng-editor-sample-data",revision:"99cbceae8d594c44cb509df95975ac1676a2b44a",sourcePath:"focused-fixtures/source-backed/authoring/"};
  const snap=settings.revision;
  const src="https://raw.githubusercontent.com/"+settings.repository+"/"+snap+"/"+settings.sourcePath;
  const seeded=[
    ["rhel_9/rules/SV-257851.rule.yaml","rule"],
    ["shared/assessments/linux/other/home-mounted-nosuid-option.assessment.yaml","assessment"],
    ["ms_windows_11/rules/SV-253495.rule.yaml","rule"],
    ["ms_windows_11/assessments/automated/SV-253495.automated.yaml","assessment"]
  ];
  let docs=new Map(),ruleRows=[],chosen=null,view="guided",step=0,filter="all",search="",message="",dirtySource=false;
  let sampleText="",candidate=new Map();
  const levels=["at_least_one_exists_and_all_match","at_least_one_exists_and_some_match","at_least_one_exists_and_only_one_matches","only_one_exists_and_matches","none_exist","none_match","may_be_absent_and_all_match"];
  const getNode=(obj,path)=>path.reduce((o,k)=>o==null?undefined:o[k],obj);
  const putNode=(obj,path,value)=>{let o=obj;for(let i=0;i<path.length-1;i++)o=o[path[i]];o[path[path.length-1]]=value};
  function parse(srcText){
    if(srcText.length>1800000)throw Error("Document exceeds 1.8 MB browser-demo limit");
    const o=jsyaml.load(srcText);
    if(!o||typeof o!=="object"||Array.isArray(o))throw Error("Expected YAML document mapping");
    const kind=o.rule?"rule":o.assessment?"assessment":null;
    if(!kind||typeof o[kind]!=="object"||!o[kind].id)throw Error("Expected a rule.id or assessment.id");
    return {kind,id:String(o[kind].id),tree:o};
  }
  function addDoc(name,source,origin,override=false){
    const p=parse(source),key=p.kind+":"+p.id;
    if(docs.has(key)&&!override)throw Error("File with id "+p.id+" already loaded");
    const prev=docs.get(key);
    docs.set(key,{name:String(name),key,kind:p.kind,id:p.id,tree:p.tree,source,original:prev?prev.original:source,origin,changed:false});
    return key;
  }
  function readState(){
    try{
      const stored=JSON.parse(localStorage.getItem("scapng-browser-drafts-v1")||"null");
      if(Array.isArray(stored))for(const d of stored){try{addDoc(d.name,d.source,"Local browser draft",true)}catch(e){}}
    }catch(e){}
  }
  function saveState(){
    try{localStorage.setItem("scapng-browser-drafts-v1",JSON.stringify([...docs.values()].filter(d=>d.origin==="Local import"||d.changed).map(d=>({name:d.name,source:d.source}))))}catch(e){}
  }
  function indexRules(){
    ruleRows=[...docs.values()].filter(d=>d.kind==="rule").map(d=>{
      let r=d.tree.rule,aid=r.assessment_choices?.automated?.assessment;
      let linked=aid?docs.get("assessment:"+aid):undefined;
      let status=linked?"automated":aid?"needs-review":"not-automated";
      return {id:String(r.id),title:String(r.title||r.id),severity:String(r.severity||"unknown"),version:r.version||"",aliases:(r.identifiers||[]).map(x=>x.value).filter(Boolean),aid,linked,status};
    }).sort((a,b)=>a.id.localeCompare(b.id));
  }
  const active=()=>ruleRows.find(r=>r.id===chosen);
  const doc=()=>active()?.linked;
  function display(txt,bad=false){message=txt;$("status").textContent=txt;$("status").className=bad?"warning":""}
  function flag(r){
    if(candidate.has(r.id))return '<span class="tag orange">AI candidate? Human proposal only</span>';
    if(r.status==="automated")return '<span class="tag green">Linked automated Assessment</span>';
    if(r.status==="needs-review")return '<span class="tag orange">Assessment link not loaded</span>';
    return '<span class="tag orange">No automation link in loaded Rule</span>';
  }
  function library(){
    const choices=[["all","All"],["automated","Automated"],["not-automated","Not automated"],["needs-review","Needs review"],["candidates","Candidates"]];
    $("filters").innerHTML=choices.map(([val,name])=>'<button class="'+(filter===val?"selected":"")+'" data-filter="'+val+'">'+name+'</button>').join("");
    $("filters").querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;library()});
    const matches=ruleRows.filter(r=>{
      if(search&&!(r.id+" "+r.title+" "+r.version+" "+r.aliases.join(" ")).toLowerCase().includes(search))return false;
      if(filter==="candidates")return candidate.has(r.id);
      if(filter==="all")return true;
      return r.status===filter;
    });
    $("counter").textContent=matches.length+" of "+ruleRows.length+" loaded Rules · not a complete benchmark";
    $("rules").innerHTML=matches.length?matches.map(r=>'<div class="rule '+(chosen===r.id?"active":"")+'" data-id="'+esc(r.id)+'"><span class="rid">'+esc(r.id)+'</span><p>'+esc(r.title)+'</p>'+flag(r)+'</div>').join(""):'<div class="empty">No matching Rules in the loaded files.<p>Import Rule YAML to broaden the search.</p></div>';
    $("rules").querySelectorAll("[data-id]").forEach(e=>e.onclick=()=>open(e.dataset.id));
  }
  function open(id){chosen=id;view="guided";step=0;dirtySource=false;library();render()}
  function tabs(){
    $("tabs").querySelectorAll("[data-view]").forEach(e=>{e.classList.toggle("selected",e.dataset.view===view);e.disabled=!doc()});
    $("export").disabled=!doc();$("original").disabled=!doc();
  }
  function setView(name){if(!doc())return;
    const raw=$("rawyaml");if(raw&&raw.value!==doc().source){display("Apply your YAML source changes before switching views.",true);return}
    view=name;render();
  }
  function field(path,name,value,opts){
    if(value===undefined||value===null)return "";
    const enc=encodeURIComponent(JSON.stringify(path));
    const v=String(value);
    const choice=Array.isArray(opts)?'<select data-field="'+enc+'">'+[...new Set([v,...opts])].map(x=>'<option value="'+esc(x)+'" '+(x===v?"selected":"")+'>'+esc(x.replaceAll("_"," "))+'</option>').join("")+'</select>':'<input type="text" data-field="'+enc+'" value="'+esc(v)+'" aria-label="'+esc(name)+'">';
    return '<div class="property"><label>'+esc(name)+'</label>'+choice+'</div>';
  }
  function walk(o,path,heading,depth=0){
    if(depth>13)return '<p class="warning">Deep structure; see Source view</p>';
    if(Array.isArray(o))return o.map((v,i)=>walk(v,path.concat(i),heading+" / "+(i+1),depth+1)).join("");
    if(o&&typeof o==="object")return Object.entries(o).map(([key,v])=>{
      if(typeof v==="object"&&v!==null)return walk(v,path.concat(key),heading+" / "+key,depth+1);
      const label=key==="require"?"Existence and match":key==="equals"?"Equals":key==="matches_regex"?"Regular expression":key==="case_insensitive_equals"?"Equals (case-insensitive)":key;
      return '<div class="stack"><small>'+esc(heading)+'</small>'+field(path.concat(key),label,v,key==="require"?levels:null)+'</div>';
    }).join("");
    return '<div class="stack">'+esc(heading)+": "+esc(o)+'</div>';
  }
  function testCard(id,t){
    const path=["assessment","tests",id];
    let o=t.object;
    return '<article class="card"><h3>'+esc(t.test_title||id)+'</h3><p><code>'+esc(id)+'</code> · <b>'+esc(t.capability||"unknown")+'</b></p>'+
      field(path.concat("collected_items_require"),"Items present and matching",t.collected_items_require,levels)+
      field(path.concat("states_match"),"States match",t.states_match,["all","any","none","one"])+
      (typeof o==="string"?'<p>Shared Object: <code>'+esc(o)+'</code></p>':walk(o,path.concat("object"),"Object selector"))+
      '<h4>Expected state fields</h4>'+walk(t.states||[],path.concat("states"),"State")+'</article>';
  }
  function logic(n){
    if(n==null)return '<span class="leaf">No evaluate block</span>';
    if(n.test)return '<div class="leaf">TEST: '+esc(n.test)+'</div>';
    if(n.not)return '<div class="logic"><strong>NOT</strong>'+logic(n.not)+'</div>';
    if(n.all||n.any){let key=n.all?"all":"any",a=n[key];return '<div class="logic"><strong>'+(key==="all"?"AND — all branches":"OR — any branch")+'</strong>'+a.map(logic).join("")+'</div>'}
    return '<pre>'+esc(JSON.stringify(n,null,2))+'</pre>';
  }
  function overview(){
    const a=doc().tree.assessment;
    return '<section class="card"><h3>Assessment logic · '+esc(a.id)+'</h3><p>'+esc(a.assessment_title)+'</p><p class="help">Selected source profile: '+esc(a.specification?.version||"unspecified")+' · Pre-alpha research; no schema validator or scanner connected</p></section>'+
      '<div class="grid">'+Object.entries(a.tests||{}).map(([id,t])=>testCard(id,t)).join("")+'</div>'+
      '<section class="card"><h3>Test combination</h3><p>Logical structure only. No pass/fail calculation.</p>'+logic(a.evaluate)+'</section>';
  }
  function wizard(){
    const a=doc().tree.assessment,tests=Object.entries(a.tests||{});
    const names=["Purpose","Collection","Conditions","Logic","Samples"];
    let header='<div class="steps">'+names.map((n,i)=>'<button data-step="'+i+'" class="'+(step===i?"selected":"")+'">'+(i+1)+". "+n+'</button>').join("")+'</div>';
    let content="";
    if(step===0)content='<section class="card"><h3>1 · Understand this requirement</h3><p>'+esc(a.assessment_title)+'</p><p>Rule: <b>'+esc(chosen)+'</b> · Assessment: '+esc(a.id)+'</p><p class="help">The current source is the starting choice; an AI is not silently changing it.</p></section>';
    if(step===1)content='<section class="card"><h3>2 · What should be collected?</h3><p>Edit collection and Item matching requirements. Changing a value updates the editable source draft.</p></section>'+
      tests.map(([id,t])=>'<section class="card"><h3>'+esc(id)+'</h3><p>Capability: '+esc(t.capability)+'</p>'+
      field(["assessment","tests",id,"collected_items_require"],"Required Items",t.collected_items_require,levels)+
      (typeof t.object==="object"?walk(t.object,["assessment","tests",id,"object"],"Object"): '<p>Shared Object: '+esc(t.object)+'</p>')+'</section>').join("");
    if(step===2)content='<section class="card"><h3>3 · Which fields must match?</h3><p>Existence and matching are separate concerns; every nested record remains visible.</p></section>'+
      tests.map(([id,t])=>'<section class="card"><h3>'+esc(t.test_title||id)+'</h3>'+walk(t.states||[],["assessment","tests",id,"states"],"State")+'</section>').join("");
    if(step===3)content='<section class="card"><h3>4 · How do Tests combine?</h3><p>Read the exact OR/AND tree. Restructuring expressions is available in Source view; graphical restructuring is not yet implemented.</p>'+logic(a.evaluate)+'</section>';
    if(step===4)content=fixtures();
    return header+content+'<div class="actions">'+(step>0?'<button class="button" id="prev">Previous</button>':'')+(step<4?'<button class="button primary" id="next">Accept current & continue →</button>':'<button class="button primary" id="gotoSource">Review source</button>')+'<button class="button" id="gotoGraph">Graphical view</button></div>';
  }
  function fixtures(){
    const template=sampleText||JSON.stringify({rule_id:chosen,assessment_id:doc().id,synthetic:true,source_status:"complete",sources:[{object:"example",items:[{id:"synthetic-item-1",fields:{}}]}],expected_result:{value:null,review_status:"unreviewed"}},null,2);
    return '<section class="card"><h3>Synthetic sample observations</h3><p>Supply typed Items and source status. This demo does <strong>not</strong> compute an Assessment result; expected outcomes are human hypotheses.</p><textarea class="editor" id="sampleText" spellcheck="false">'+esc(template)+'</textarea><div class="actions"><button id="exportSample" class="button primary">Download sample JSON</button></div><p class="warning">NOT SCANNER-VERIFIED — no tested evaluation engine connected.</p></section>';
  }
  function rawEditor(){return '<div class="card"><h3>YAML source</h3><p class="help">Original source is preserved until you edit. Structured edits reserialize YAML and may change formatting; export and review diffs carefully.</p><textarea id="rawyaml" class="editor" spellcheck="false">'+esc(doc().source)+'</textarea><div class="actions"><button id="applyYAML" class="button primary">Apply YAML to other views</button><span id="rawStatus" class="help">Source and graphical views synchronized</span></div></div>'}
  function sourceView(){return rawEditor()}
  function render(){
    const r=active();tabs();
    if(!r){$("crumb").textContent="LOCAL BROWSER WORKSPACE";$("title").textContent="SCAP-NG Assessment Studio";$("content").innerHTML='<section class="card"><h3>Open a Rule to begin</h3><p>Import Rule and Assessment YAML, or use the two pinned external examples once loaded. This browser demo does not call AI or execute the scanner.</p></section>';return}
    $("crumb").textContent=r.id+' · '+(r.version||"source revision not specified");
    $("title").textContent=r.title;
    $("state").textContent="No scanner connected";
    const d=doc();
    if(!d){$("content").innerHTML='<section class="card"><h3>Rule loaded · Assessment unavailable</h3><p>'+esc(r.aid?"Linked Assessment "+r.aid+" was not imported.":"No automated Assessment link in this Rule.")+'</p><p>Import its Assessment YAML to enable graphical editing, or inspect the Rule in your source file.</p><button id="suggest" class="button">Mark as proposed automation candidate</button></section>';$("suggest").onclick=()=>{const why=prompt("Reviewer rationale for possible automation (proposal only)");if(why){candidate.set(r.id,why);library();display("Candidate proposal saved in browser session")}};return}
    $("notice").textContent="Imported source: "+d.origin+" · Draft-only. No authoritative schema verification or scanner evaluation.";
    let html=view==="guided"?wizard():view==="graphical"?overview():view==="source"?sourceView():view==="split"?'<div class="split"><div>'+overview()+'</div>'+rawEditor()+'</div>':fixtures();
    $("content").innerHTML=html;
    $("content").querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{step=Number(b.dataset.step);render()});
    $("content").querySelectorAll("[data-field]").forEach(e=>e.onchange=()=>{
      const path=JSON.parse(decodeURIComponent(e.dataset.field));
      let d=doc(),v=e.value;
      const orig=getNode(d.tree,path);
      if(typeof orig==="number"){const n=Number(v);if(!Number.isFinite(n)){display("Invalid number",true);return}v=n}
      putNode(d.tree,path,v);
      try{d.source=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});d.changed=true;saveState();display("Draft changed at "+path.slice(-3).join(" / ")+" — YAML reformatted; review before export");render()}catch(ex){putNode(d.tree,path,orig);display(ex.message,true)}
    });
    const raw=$("rawyaml");
    if(raw){raw.oninput=()=>{$("rawStatus").textContent="Unapplied changes — apply before switching";dirtySource=true};
      $("applyYAML").onclick=()=>{try{const p=parse(raw.value),d=doc();if(p.kind!=="assessment"||p.id!==d.id)throw Error("Assessment id must stay "+d.id+" in this demo");d.tree=p.tree;d.source=raw.value;d.changed=true;dirtySource=false;saveState();display("Source parsed and graphical views updated");render()}catch(ex){display("Source error: "+ex.message,true);$("rawStatus").textContent=ex.message}}}
    const p=$("prev");if(p)p.onclick=()=>{step--;render()};
    const n=$("next");if(n)n.onclick=()=>{step++;render()};
    const x=$("gotoSource");if(x)x.onclick=()=>setView("source");
    const y=$("gotoGraph");if(y)y.onclick=()=>setView("graphical");
    const fixture=$("sampleText");
    if(fixture)fixture.oninput=()=>{sampleText=fixture.value};
    const exportSample=$("exportSample");if(exportSample)exportSample.onclick=()=>{try{const s=$("sampleText").value;JSON.parse(s);sampleText=s;download(r.id+"-synthetic-sample.json",s,"application/json");display("Synthetic sample downloaded — no scanner execution performed")}catch(e){display("Sample JSON invalid: "+e.message,true)}};
  }
  function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name.replace(/[^a-zA-Z0-9_.-]/g,"_");document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
  $("query").oninput=e=>{search=e.target.value.toLowerCase();library()};
  $("tabs").querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $("import").onclick=()=>$("upload").click();
  $("upload").onchange=async e=>{
    let imported=0;
    for(const file of Array.from(e.target.files)){try{addDoc(file.name,await file.text(),"Local import");imported++}catch(err){display(file.name+": "+err.message,true)}}
    e.target.value="";indexRules();library();saveState();if(!chosen&&ruleRows.length)open(ruleRows[0].id);else render();
    if(imported)display("Imported "+imported+" source document(s). This is a local browser draft.");
  };
  $("export").onclick=()=>{if(!doc())return;let raw=$("rawyaml");if(raw&&raw.value!==doc().source){display("Apply source edits before exporting",true);return}download(doc().name,doc().source,"text/yaml");display("YAML downloaded to your device")};
  $("original").onclick=()=>{const d=doc();if(d&&confirm("Restore this Assessment to its original loaded source?")){const p=parse(d.original);d.source=d.original;d.tree=p.tree;d.changed=false;saveState();render();display("Original restored.")}};
  async function init(){
    if(!window.jsyaml){display("YAML parser asset did not load — app cannot parse files.",true);return}
    display("Loading two pinned Rule/Assessment examples from public GitHub…");
    const got=await Promise.all(seeded.map(async ([path])=>{
      try{const url=src+path;const res=await fetch(url,{cache:"force-cache"});if(!res.ok)throw Error("HTTP "+res.status);return {name:path.split("/").pop(),text:await res.text(),url}}
      catch(e){return {err:path+": "+e.message}}
    }));
    let failures=[];
    for(const item of got){if(item.err){failures.push(item.err);continue}try{addDoc(item.name,item.text,"Pinned source "+snap.slice(0,10))}catch(e){failures.push(item.name+": "+e.message)}}
    readState();indexRules();if(ruleRows.length)chosen=ruleRows[0].id;library();render();
    display(failures.length?"Only "+(got.length-failures.length)+" examples loaded; import local YAML to continue. "+failures[0]:"Loaded "+ruleRows.length+" pinned Rules and linked Assessments. Choose one to review.",!!failures.length);
  }
  init();
})();
