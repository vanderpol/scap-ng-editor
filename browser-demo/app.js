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
    ["ms_windows_11/assessments/automated/SV-253495.automated.yaml","assessment"],
    ["ms_windows_11/rules/SV-253254.rule.yaml","rule"],
    ["ms_windows_11/assessments/automated/SV-253254.automated.yaml","assessment"],
    ["rhel_9/rules/SV-257889.rule.yaml","rule"],
    ["shared/assessments/linux/other/initialization-files-0740-less-permissive.assessment.yaml","assessment"],
    ["apache_server_2-4_unix_server/rules/SV-214228.rule.yaml","rule"],
    ["apache_server_2-4_unix_server/assessments/automated/SV-214228.automated.yaml","assessment"],
    ["ms_windows_server_dns/rules/SV-259345.rule.yaml","rule"],
    ["ms_windows_server_dns/assessments/automated/SV-259345.automated.yaml","assessment"]
  ];
  let docs=new Map(),ruleRows=[],chosen=null,selectedTest=null,view="graphical",step=0,filter="all",search="",message="",dirtySource=false;
  // Only one STIG can reveal its Rules. Others have no Rule DOM nodes.
  let expandedStig=null;
  // Catalog metadata is separate from loaded/editable documents (lazy Rule/Assessment fetch).
  let catalogRuleRows=[],catalogBase="",catalogAssessmentPaths=new Map(),catalogStatus="";
  const catalogConfig=window.SCAPNG_COMPLETE_CATALOG||null;

  let sampleText="",candidate=new Map();
  // Load interpreter choices from the exact upstream version-pinned capability mapping.
  // No guessed fallback enum: when unavailable, users can still inspect raw YAML.
  let shellChoices=null,shellChoicesVersion=null,shellChoicesError="Capability vocabulary not loaded.";
  async function loadShellVocabulary(){
    const config=window.SCAPNG_DEMO_SHELL_MAPPING;
    if(!config?.repository||!config?.revision||!config?.path)return;
    try{
      const url="https://raw.githubusercontent.com/"+config.repository+"/"+config.revision+"/"+config.path;
      const res=await fetch(url,{cache:"force-cache"});
      if(!res.ok)throw Error("HTTP "+res.status);
      const spec=await res.json();
      const choices=spec.native?.collection_parameters?.shell?.enum;
      if(spec.capability!=="independent.shellcommand"||spec.specification_version!==config.specificationVersion||
         !Array.isArray(choices)||!choices.length||!choices.every(x=>typeof x==="string"&&x.length>0)||
         new Set(choices).size!==choices.length)throw Error("Invalid or mismatched capability vocabulary.");
      shellChoices=Object.freeze([...choices]);
      shellChoicesVersion=spec.specification_version;
      shellChoicesError="";
    }catch(err){
      shellChoices=null;shellChoicesVersion=null;
      shellChoicesError="Pinned interpreter choices unavailable: "+err.message;
    }
  }
  function shellInterpreterControl(path,shell,documentVersion){
    const label='<label class="interpreter-label">Interpreter <small>(collect.shell)</small></label>';
    if(shell===undefined||shell===null)return '<p class="warning">Interpreter is not defined in this source.</p>';
    if(typeof shell==="object")
      return '<div class="interpreter-row">'+label+'<span class="help">Defined by '+esc(shell.variable?"Variable: "+shell.variable:"a source expression")+' — see collection details</span></div>';
    if(typeof shell!=="string")return '<div class="interpreter-row">'+label+'<span class="warning">Unsupported interpreter value; inspect source.</span></div>';
    const allowed=shellChoices&&shellChoicesVersion===documentVersion&&shellChoices.includes(shell);
    if(!allowed)return '<div class="interpreter-row">'+label+'<code>'+esc(shell)+'</code><span class="help">Read-only: '+esc(!shellChoices?shellChoicesError:shellChoicesVersion!==documentVersion?"No matching pinned vocabulary for this document.":"Value not in pinned vocabulary.")+'</span></div>';
    const enc=encodeURIComponent(JSON.stringify(path));
    return '<div class="interpreter-row">'+label+'<select class="interpreter-select" data-field="'+enc+'" aria-label="Interpreter">'+
      shellChoices.map(x=>'<option value="'+esc(x)+'" '+(x===shell?"selected":"")+'>'+esc(x)+'</option>').join("")+
      '</select></div>';
  }

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
  function addDoc(name,source,origin,override=false,sourcePath=null){
    const p=parse(source),key=p.kind+":"+p.id;
    if(docs.has(key)&&!override)throw Error("File with id "+p.id+" already loaded");
    const prev=docs.get(key);
    docs.set(key,{name:String(name),key,kind:p.kind,id:p.id,tree:p.tree,source,original:prev?prev.original:source,origin,sourcePath:sourcePath||prev?.sourcePath||null,changed:false});
    return key;
  }
  function readState(){
    try{
      const stored=JSON.parse(localStorage.getItem("scapng-browser-drafts-v1")||"null");
      if(Array.isArray(stored))for(const d of stored){try{addDoc(d.name,d.source,"Local browser draft",true,d.sourcePath||null)}catch(e){}}
    }catch(e){}
  }
  function saveState(){
    try{localStorage.setItem("scapng-browser-drafts-v1",JSON.stringify([...docs.values()].filter(d=>d.origin==="Local import"||d.changed).map(d=>({name:d.name,source:d.source,sourcePath:d.sourcePath}))))}catch(e){}
  }
  const STIG_NAMES=Object.freeze({
    "rhel_9":"RHEL 9",
    "ms_windows_11":"Windows 11",
    "apache_server_2-4_unix_server":"Apache HTTP Server 2.4 (Unix)",
    "ms_windows_server_dns":"Windows Server DNS",
    "oracle_linux_9":"Oracle Linux 9",
    "ms_windows_server_2025":"Windows Server 2025"
  });
  function stigForRule(d){
    const source=d.sourcePath;
    if(!source)return {key:"imported",name:"Imported Rules (STIG not identified)"};
    const part=source.replaceAll("\\","/").split("/")[0];
    if(!part||part==="rules")return {key:"imported",name:"Imported Rules (STIG not identified)"};
    return {key:part,name:STIG_NAMES[part]||part.replaceAll("_"," ")};
  }
  function assessmentReferenceClosure(id,stack=[]){
    if(stack.includes(id))return {ready:false,reason:"Cyclic Assessment dependency: "+[...stack,id].join(" → ")};
    const target=docs.get("assessment:"+id);
    if(!target)return {ready:false,reason:"Referenced automated Assessment not loaded: "+id};
    const a=target.tree.assessment;
    const refs=new Set();
    const gather=(value,depth=0)=>{
      if(depth>64||!value||typeof value!=="object")return;
      if(Array.isArray(value)){value.forEach(v=>gather(v,depth+1));return}
      if(typeof value.assessment==="string")refs.add(value.assessment);
      for(const [key,v] of Object.entries(value)){
        if(key!=="assessment"&&v&&typeof v==="object")gather(v,depth+1);
      }
    };
    gather(a.evaluate);
    gather(a.applicability);
    for(const ref of refs){
      const outcome=assessmentReferenceClosure(ref,stack.concat(id));
      if(!outcome.ready)return outcome;
    }
    return {ready:true,reason:""};
  }
  function safeCatalogPath(path){
    return typeof path==="string"&&/^complete-stigs\/(?:authoring\/[A-Za-z0-9_./-]+\.ya?ml|(?:rhel_9|ms_windows_11)\/index\.json|manifest\.json)$/.test(path)&&
      !path.includes("..");
  }
  async function fetchCatalogText(path){
    if(!catalogBase||!safeCatalogPath(path))throw Error("Invalid pinned catalog source path.");
    const response=await fetch(catalogBase+path,{cache:"force-cache"});
    if(!response.ok)throw Error("Source unavailable (HTTP "+response.status+")");
    return response.text();
  }
  async function loadCompleteCatalog(){
    const config=catalogConfig;
    if(!config?.repository||!/^[0-9a-f]{40}$/.test(config.revision)||!config.manifestPath)return;
    catalogBase="https://raw.githubusercontent.com/"+config.repository+"/"+config.revision+"/";
    try{
      const manifest=JSON.parse(await fetchCatalogText(config.manifestPath));
      if(manifest.format!=="scap-ng-editor-complete-stigs/1"||manifest.source_tag!=="v0.4.0-joval-meeting-preview-20261015-r3"||
         !Array.isArray(manifest.stigs)||manifest.stigs.length!==2||!manifest.assessment_paths)throw Error("Unexpected preview catalog manifest.");
      const indexes=await Promise.all(manifest.stigs.map(async stig=>{
        if(!safeCatalogPath(stig.index_path))throw Error("Unsafe Rule index path");
        return {stig,document:JSON.parse(await fetchCatalogText(stig.index_path))};
      }));
      const entries=[], paths=new Map();
      for(const [id,path] of Object.entries(manifest.assessment_paths)){
        if(typeof id!=="string"||!safeCatalogPath(path))throw Error("Invalid Assessment index entry");
        paths.set(id,path);
      }
      for(const {stig,document} of indexes){
        if(document.format!=="scap-ng-editor-stig-index/1"||document.stig_id!==stig.id||
          !Array.isArray(document.rules)||document.rules.length!==stig.rule_count)throw Error("Incomplete STIG Rule index");
        const distinct=new Set();
        for(const rule of document.rules){
          if(distinct.has(rule.id)||!safeCatalogPath(rule.rule_path))throw Error("Duplicate Rule or invalid Rule source");
          distinct.add(rule.id);
          const automated=rule.assessment_choices?.automated;
          const aid=automated?.id||undefined,exists=!!(aid&&paths.has(aid));
          const manual=rule.assessment_choices?.manual;
          entries.push({
            id:rule.id,title:rule.title,severity:rule.severity,version:rule.version,aliases:[],
            stig:{key:stig.id,name:stig.name},
            aid,linked:undefined,
            status:aid?(exists?"automated":"needs-review"):"not-automated",
            reason:aid&&!exists?"Automated Assessment source not indexed: "+aid:"",
            fromCatalog:true,ruleSource:rule.rule_path,
            manualId:manual?.id||undefined,manualSource:manual?.path||undefined,
            assessmentSource:exists?paths.get(aid):undefined
          });
        }
      }
      if(entries.length!==manifest.rule_count)throw Error("Catalog count mismatch");
      catalogAssessmentPaths=paths;
      catalogRuleRows=entries;
      catalogStatus="Complete pinned preview loaded: "+entries.length+" Rules across "+indexes.length+" STIGs.";
    }catch(err){
      catalogRuleRows=[];catalogAssessmentPaths=new Map();
      catalogStatus="Complete STIG catalog unavailable: "+err.message+". Using six pinned examples.";
    }
  }
  async function loadAssessmentById(id,seen=new Set()){
    if(seen.has(id))return;
    seen.add(id);
    if(seen.size>80)throw Error("Referenced Assessment closure exceeds demo safety limit.");
    const path=catalogAssessmentPaths.get(id);
    if(!path)throw Error("Referenced Assessment not indexed: "+id);
    if(!docs.has("assessment:"+id)){
      const data=await fetchCatalogText(path),found=parse(data);
      if(found.kind!=="assessment"||found.id!==id)throw Error("Assessment identity mismatch: "+id);
      addDoc(path.split("/").pop(),data,"Pinned full STIG catalog",false,path.replace(/^complete-stigs\/authoring\//,""));
    }
    const a=docs.get("assessment:"+id).tree.assessment;
    const deps=new Set();
    const gather=node=>{
      if(!node||typeof node!=="object")return;
      if(Array.isArray(node)){for(const n of node)gather(n);return}
      if(typeof node.assessment==="string")deps.add(node.assessment);
      for(const [key,val] of Object.entries(node))if(key!=="assessment"&&val&&typeof val==="object")gather(val);
    };
    gather(a.evaluate);gather(a.applicability);
    for(const entry of Object.values(a.dependencies||{}))if(typeof entry?.assessment==="string")deps.add(entry.assessment);
    for(const ref of deps)await loadAssessmentById(ref,seen);
  }
  async function loadCatalogRule(r){
    if(!r.fromCatalog)return;
    if(!docs.has("rule:"+r.id)){
      const data=await fetchCatalogText(r.ruleSource),found=parse(data);
      if(found.kind!=="rule"||found.id!==r.id)throw Error("Rule identity mismatch: "+r.id);
      addDoc(r.id+".rule.yaml",data,"Pinned full STIG catalog",false,r.ruleSource.replace(/^complete-stigs\/authoring\//,""));
    }
    if(r.aid)await loadAssessmentById(r.aid);
    else if(r.manualId)await loadAssessmentById(r.manualId);
  }
  function indexRules(){
    ruleRows=[...docs.values()].filter(d=>d.kind==="rule").map(d=>{
      let r=d.tree.rule,aid=r.assessment_choices?.automated?.assessment;
      const manualId=r.assessment_choices?.manual?.assessment;
      let linked=aid?docs.get("assessment:"+aid):undefined;
      const closure=aid?assessmentReferenceClosure(aid):null;
      let status=closure?(closure.ready?"automated":"needs-review"):"not-automated";
      return {id:String(r.id),title:String(r.title||r.id),severity:String(r.severity||"unknown"),version:r.version||"",aliases:(r.identifiers||[]).map(x=>x.value).filter(Boolean),aid,linked,status,reason:closure?.reason||"",manualId,stig:stigForRule(d)};
    });
    const merged=new Map(catalogRuleRows.map(r=>[r.id,r]));
    for(const r of ruleRows)merged.set(r.id,r);
    ruleRows=[...merged.values()].sort((a,b)=>a.id.localeCompare(b.id));
  }
  const active=()=>ruleRows.find(r=>r.id===chosen);
  const doc=()=>active()?.linked;
  const manualDoc=()=>active()?.manualId?docs.get("assessment:"+active().manualId):null;
  function display(txt,bad=false){message=txt;$("status").textContent=txt;$("status").className=bad?"warning":""}
  function flag(r){
    if(candidate.has(r.id))return '<span class="tag orange">AI candidate? Human proposal only</span>';
    if(r.status==="automated")return '<span class="tag green">Automated Assessment</span>';
    if(r.status==="needs-review")return '<span class="tag orange" title="'+esc(r.reason||"Assessment source unavailable")+'">Assessment reference unresolved</span>';
    return '<span class="tag orange">No automation link in loaded Rule</span>';
  }
  function library(){
    const choices=[["all","All"],["automated","Automated"],["not-automated","Without automated choice"],["needs-review","Assessment not loaded"],["candidates","Candidates"]];
    $("filters").innerHTML=choices.map(([v,name])=>'<button class="'+(filter===v?"selected":"")+'" data-filter="'+v+'">'+name+'</button>').join("");
    $("filters").querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{
      filter=b.dataset.filter;
      if(filter==="all"){search="";$("query").value=""}
      expandedStig=null;chosen=null;selectedTest=null;
      library();render();
    });
    const matches=ruleRows.filter(r=>{
      if(search&&!(r.id+" "+r.title+" "+r.version+" "+r.aliases.join(" ")+" "+r.stig.name).toLowerCase().includes(search))return false;
      if(filter==="candidates")return candidate.has(r.id);
      return filter==="all"||r.status===filter;
    });
    const grouped=new Map();
    for(const r of matches){
      if(!grouped.has(r.stig.key))grouped.set(r.stig.key,{stig:r.stig,rules:[]});
      grouped.get(r.stig.key).rules.push(r);
    }
    const groups=[...grouped.values()].sort((a,b)=>a.stig.name.localeCompare(b.stig.name));
    $("counter").textContent=groups.length+" STIGs · "+matches.length+" of "+ruleRows.length+" loaded Rules · partial catalog";
    $("rules").innerHTML=groups.length?groups.map(({stig,rules})=>{
      const expanded=expandedStig===stig.key;
      const automated=rules.filter(r=>r.status==="automated").length;
      return '<section class="stig-group">'+
        '<button class="stig-toggle" data-stig="'+esc(stig.key)+'" aria-expanded="'+expanded+'">'+
        '<span class="stig-arrow">'+(expanded?"▾":"▸")+'</span><span class="stig-title">'+esc(stig.name)+'</span>'+
        '<small>'+rules.length+' Rules · '+automated+' automated</small></button>'+
        (expanded?'<div class="stig-rules" role="group" aria-label="'+esc(stig.name)+' Rules">'+
          rules.map(r=>'<button class="rule '+(chosen===r.id?"active":"")+'" data-id="'+esc(r.id)+'">'+
            '<span class="rid">'+esc(r.id)+'</span><span class="rule-name">'+esc(r.title)+'</span>'+
            flag(r)+(r.linked&&r.aid.startsWith("ng.shared.")?'<span class="tag">Shared Assessment resolved</span>':"")+
            '</button>').join("")+'</div>':"")+
        '</section>';
    }).join(""):'<div class="empty">No matching loaded Rules.<p>Import a Rule and its Assessment to expand this library.</p></div>';
    $("rules").querySelectorAll("[data-stig]").forEach(b=>b.onclick=()=>{
      expandedStig=expandedStig===b.dataset.stig?null:b.dataset.stig;
      chosen=null;selectedTest=null;
      library();render();
    });
    $("rules").querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>open(b.dataset.id));
  }
  async function open(id){
    chosen=id;expandedStig=ruleRows.find(r=>r.id===id)?.stig.key||null;
    selectedTest=null;view="graphical";step=0;dirtySource=false;
    library();
    const requested=ruleRows.find(r=>r.id===id);
    if(requested?.fromCatalog){
      $("title").textContent=requested.title;
      $("content").innerHTML='<section class="card"><h3>Loading selected Rule</h3><p>Retrieving its pinned source and linked Assessment.</p></section>';
      try{
        await loadCatalogRule(requested);
        if(chosen!==id)return;
        indexRules();
      }catch(err){
        if(chosen!==id)return;
        $("content").innerHTML='<section class="card"><h3>Source could not be loaded</h3><p>'+esc(err.message)+'</p><p>Other Rules are still available.</p></section>';
        display("Rule load error: "+err.message,true);return;
      }
    }
    if(chosen!==id)return;
    library();render();
  }
  function tabs(){
    $("tabs").querySelectorAll("[data-view]").forEach(e=>{e.classList.toggle("selected",e.dataset.view===view);e.disabled=!(doc()||manualDoc())||(manualDoc()&&e.dataset.view!=="graphical"&&e.dataset.view!=="source")});
    $("export").disabled=!(doc()||manualDoc());$("original").disabled=!(doc()||manualDoc());
  }
  function setView(name){if(!doc()&&!manualDoc())return;
    const raw=$("rawyaml");if(raw&&raw.value!==(doc()||manualDoc()).source){display("Apply your YAML source changes before switching views.",true);return}
    view=name;render();
  }
  function field(path,name,value,opts){
    if(value===undefined||value===null)return "";
    const enc=encodeURIComponent(JSON.stringify(path));
    const v=String(value);
    const optionLabel=x=>levels.includes(x)?requirementDescription(x)+" ("+x+")":
      ["all","any","none","one"].includes(x)?({all:"All conditions must match",any:"At least one condition must match",none:"No conditions may match",one:"Exactly one condition must match"}[x])+" ("+x+")":x.replaceAll("_"," ");
    const choice=Array.isArray(opts)?'<select data-field="'+enc+'" aria-label="'+esc(name)+'">'+[...new Set([v,...opts])].map(x=>'<option value="'+esc(x)+'" '+(x===v?"selected":"")+'>'+esc(optionLabel(x))+'</option>').join("")+'</select>':'<input type="text" data-field="'+enc+'" value="'+esc(v)+'" aria-label="'+esc(name)+'">';
    return '<div class="property"><label>'+esc(name)+'</label>'+choice+'</div>';
  }
  const prettyName = k => ({
    collected_items_require:"What must be true of the collected entries? (collected_items_require)",
    state_fields_require:"What must be true of the expected fields? (state_fields_require)",
    reported_elements:"What details should be reported? (reported_elements)",
    states_match:"How must alternative conditions match? (states_match)",
    case_insensitive_equals:"equals (ignoring case)",
    matches_regex:"matches regular expression",
    greater_than_or_equal:"is at least",
    less_than_or_equal:"is at most",
    greater_than:"is greater than",
    less_than:"is less than",
    require:"How many must exist and match? (require)",
    for_each:"Repeat this check for each entry (for_each)",
    fields:"Fields inside this record (fields)",
    object:"Where the data comes from (Object)",
    set:"How collections are combined (set)",
    operands:"Collections to combine (operands)",
    filters:"Which collected entries are included or excluded? (filters)",
    select:"Which entries should be selected? (select)",
    collect:"How the data is collected (collect)",
    expression:"How this value is calculated (expression)",
    state:"Condition that must be satisfied (State)",
    states:"What the collected data must satisfy (States)",
    and:"All of these must be true (and)",
    or:"At least one of these must be true (or)",
    record:"Structured value with named fields (record)"
  })[k]||String(k).replaceAll("_"," ");
  const requirementDescription = k => ({
    at_least_one_exists_and_all_match:"One or more must exist; all must match",
    at_least_one_exists_and_some_match:"One or more must exist; at least one must match",
    at_least_one_exists_and_only_one_matches:"One or more must exist; exactly one must match",
    only_one_exists_and_matches:"Exactly one must exist and match",
    none_exist:"None may exist",
    none_match:"None may match",
    may_be_absent_and_all_match:"May be absent; any present must match"
  })[k]||String(k||"Not explicitly specified").replaceAll("_"," ");
  function shortClause(node,name){
    if(!node||Array.isArray(node)||typeof node!=="object")return "";
    const ops=["case_insensitive_equals","equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than","from"];
    const key=ops.find(k=>Object.hasOwn(node,k));
    if(!key)return "";
    const value=node[key];
    return String(name)+" "+prettyName(key)+" "+(value&&typeof value==="object"?"a referenced value":String(value));
  }
  function summarizeCondition(n,depth=0){
    if(!n||typeof n!=="object"||depth>6)return "";
    if(Array.isArray(n))return n.slice(0,3).map(x=>summarizeCondition(x,depth+1)).filter(Boolean).join("; ")+(n.length>3?" … +"+(n.length-3)+" more":"");
    if(Array.isArray(n.and))return "("+n.and.map(x=>summarizeCondition(x,depth+1)).filter(Boolean).join(" AND ")+")";
    if(Array.isArray(n.or))return "("+n.or.map(x=>summarizeCondition(x,depth+1)).filter(Boolean).join(" OR ")+")";
    if(n.record?.fields)return "record: "+Object.entries(n.record.fields).map(([k,v])=>k+" "+summarizeCondition(v,depth+1)).join("; ");
    const comparisons=["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"];
    const cmp=comparisons.find(k=>Object.hasOwn(n,k));
    if(cmp)return prettyName(cmp)+" "+String(n[cmp]);
    return Object.entries(n).filter(([k])=>k!=="require"&&k!=="state_fields_require").slice(0,4).map(([k,v])=>k+" "+summarizeCondition(v,depth+1)).join("; ");
  }
  function summarizeTest(t){
    const states=t.states||[];
    if(!states.length)return "No expected conditions (States) defined";
    const parts=states.slice(0,2).map(s=>summarizeCondition(s)).filter(Boolean);
    if(!parts.length)return states.length+" expected conditions (States)";
    const join=t.states_match==="any"?" OR ":t.states_match==="all"?" AND ":" · ";
    const s=parts.join(join)+(states.length>2?" … +"+(states.length-2)+" other conditions":"");
    return s.length>125?s.slice(0,121)+"…":s;
  }
  function walk(o,path,heading,depth=0){
    if(depth>32)return '<p class="warning">Deep structure. Use Source to inspect further.</p>';
    if(Array.isArray(o)){
      const name=heading==="filters"?"Filter":heading==="operands"?"Operand":heading==="and"?"Required condition":heading==="or"?"Alternative condition":heading==="states"||heading==="States"?"Condition (State)":heading==="concat"?"Part":"Item";
      return o.map((v,i)=>walk(v,path.concat(i),name+" "+(i+1),depth+1)).join("");
    }
    if(o&&typeof o==="object"){
      const keys=Object.keys(o), clause=shortClause(o,heading);
      const special=heading==="for_each"?"For each "+String(o.item||"Item")+" from "+String(o.in||"source")+" (for_each)":
        heading==="set"?"Combine collected data (set): "+String(o.operator||"unspecified")+" ("+(o.operands?.length||0)+" sources)":
        heading==="filters"?"Which collected entries to keep or exclude (filters)":null;
      const groupLabel = prettyName(heading);
      const groupSummary=special||clause||groupLabel;
      const children=Object.entries(o).map(([key,v])=>{
        if(v&&typeof v==="object")return walk(v,path.concat(key),key,depth+1);
        if(key==="shell"&&path[path.length-1]==="collect")
          return shellInterpreterControl(path.concat(key),v,doc()?.tree.assessment?.specification?.version);
        return field(path.concat(key),prettyName(key),v,key==="require"||key==="collected_items_require"||key==="state_fields_require"?levels:key==="states_match"?["all","any","none","one"]:null);
      }).join("");
      return '<details class="structure-node" '+(depth<2?"open":"")+'><summary>'+esc(groupSummary)+' <small>('+keys.length+' properties)</small></summary><div class="structure-children">'+children+'</div></details>';
    }
    return field(path,prettyName(heading),o,null);
  }
  function testCard(id,t){
    const path=["assessment","tests",id],o=t.object;
    return '<article class="card"><h3>'+esc(t.test_title||id)+'</h3><p><code>'+esc(id)+'</code> · <b>'+esc(t.capability||"unknown")+'</b></p>'+
      field(path.concat("collected_items_require"),"Which collected entries must match? (collected_items_require)",t.collected_items_require,levels)+
      field(path.concat("states_match"),"How alternatives combine (states_match)",t.states_match,["all","any","none","one"])+
      (typeof o==="string"?'<p>Shared Object: <code>'+esc(o)+'</code></p>':walk(o,path.concat("object"),"object"))+
      '<h4>What the collected data must satisfy (States)</h4>'+walk(t.states||[],path.concat("states"),"States")+'</article>';
  }
  function countTestReferences(n,refs){
    if(!n||typeof n!=="object")return;
    if(typeof n.test==="string"){refs[n.test]=(refs[n.test]||0)+1;return}
    for(const k of ["all","any"]){if(Array.isArray(n[k]))n[k].forEach(x=>countTestReferences(x,refs))}
    if(n.not)countTestReferences(n.not,refs);
  }
  // Follow explicit Assessment-result references for review without inlining
  // source definitions into the saved document. Only the owner's root Test
  // buttons are editable; referenced Assessment previews are read-only.
  function logic(n,a,refs,depth=0,chain=[]){
    a=a||doc()?.tree.assessment||{};
    refs=refs||(()=>{const counts={};countTestReferences(a.evaluate,counts);return counts})();
    if(!n)return '<p class="warning">No evaluation expression is defined.</p>';
    if(depth>32)return '<p class="warning">Dependency depth limit reached; inspect source references.</p>';
    const isLinked=a.id!==doc()?.tree.assessment?.id;
    if(typeof n.test==="string"){
      const t=a.tests?.[n.test],exists=!!t;
      if(isLinked){
        if(!exists)return '<p class="warning">Test '+esc(n.test)+' not loaded in referenced Assessment.</p>';
        return '<details class="logic-leaf linked-test"><summary>'+esc(t.test_title||n.test)+' <small>Referenced Test · '+esc(n.test)+'</small></summary>'+
          '<p><strong>Look at:</strong> '+esc(humanCollection(a,t).text)+'</p>'+
          '<p><strong>Require:</strong> '+esc(summarizeTest(t))+'</p>'+
          '<p><strong>Collected results:</strong> '+esc(requirementDescription(t.collected_items_require))+'</p>'+
          '<details class="linked-test-source"><summary>Exact referenced Test (read-only)</summary><pre>'+esc(JSON.stringify(t,null,2))+'</pre></details></details>';
      }
      return '<button class="logic-leaf '+(selectedTest===n.test?"active":"")+'" data-select-test="'+esc(n.test)+'" '+(!exists?'disabled title="Referenced Test not loaded"':"")+'><span class="logic-leaf-title">'+esc(t?.test_title||n.test)+'</span><span class="logic-leaf-summary">'+esc(t?summarizeTest(t):"Definition unavailable")+'</span><small>'+esc(n.test)+(refs[n.test]>1?' · reused in '+refs[n.test]+' branches':"")+(!exists?" · unresolved":"")+'</small></button>';
    }
    if(typeof n.assessment==="string"){
      const id=n.assessment;
      const referenced=docs.get("assessment:"+id);
      if(chain.includes(id)||id===a.id)return '<div class="warning">Assessment dependency cycle: '+esc([...chain,id].join(" → "))+'</div>';
      if(!referenced)return '<div class="warning">Referenced automated Assessment not loaded: <code>'+esc(id)+'</code>. Import its pinned source to inspect the actual checks.</div>';
      const target=referenced.tree.assessment,counts={};countTestReferences(target.evaluate,counts);
      return '<details class="logic-group assessment-reference" open><summary>Uses Assessment: '+esc(target.assessment_title||id)+' <small>'+esc(id)+' · source-linked</small></summary>'+
        '<div class="logic-children"><p class="help">Referenced Assessment, shown for review without rewriting the original definition.</p>'+
        logic(target.evaluate,target,counts,depth+1,chain.concat([a.id,id]))+'</div></details>';
    }
    if(n.not)return '<details class="logic-group" open><summary>NOT — reverse the following condition</summary><div class="logic-children">'+logic(n.not,a,refs,depth+1,chain)+'</div></details>';
    if(Array.isArray(n.all)||Array.isArray(n.any)){
      const op=Array.isArray(n.all)?"all":"any",list=n[op];
      return '<details class="logic-group" '+(depth<2?"open":"")+'><summary><strong>'+(op==="all"?"AND":"OR")+'</strong> — '+(op==="all"?"every condition must be true":"any condition may be true")+' <small>('+list.length+')</small></summary><div class="logic-children">'+list.map(x=>logic(x,a,refs,depth+1,chain)).join("")+'</div></details>';
    }
    return '<div class="warning">Other evaluation construct — inspect Source: <code>'+esc(JSON.stringify(n))+'</code></div>';
  }
  function findRefs(node,key,found){
    found=found||new Set();
    if(!node||typeof node!=="object")return found;
    if(Array.isArray(node)){node.forEach(x=>findRefs(x,key,found));return found}
    for(const [k,v] of Object.entries(node)){
      if(k===key&&typeof v==="string")found.add(v);
      if(v&&typeof v==="object")findRefs(v,key,found);
    }
    return found;
  }
  function variableTrace(a,t){
    if(!a.variables)return "";
    const pending=[...findRefs(t,"variable")],seen=new Set();
    while(pending.length){
      const id=pending.pop();if(seen.has(id))continue;seen.add(id);
      const v=a.variables[id];if(v)for(const x of findRefs(v,"variable"))if(!seen.has(x))pending.push(x);
    }
    if(!seen.size)return "";
    return '<details class="dependency-group"><summary>How required values are calculated (Variables: '+seen.size+')</summary><div class="structure-children">'+[...seen].map(id=>{
      const v=a.variables[id];const deps=v?[...findRefs(v.expression,"variable")]:[];return '<details class="structure-node"><summary>'+esc(v?.title||id)+(deps.length?' <small>← depends on '+esc(deps.map(x=>a.variables[x]?.title||x).join(", "))+'</small>':"")+'</summary><p><code>'+esc(id)+'</code></p>'+(v?walk(v.expression,["assessment","variables",id,"expression"],"expression"):'<p class="warning">Definition not loaded</p>')+'</details>';
    }).join("")+'</div></details>';
  }
  function objectTrace(a,t){
    if(!a.shared_objects)return "";
    const variableRefs=new Set(findRefs(t,"variable")),seenVars=new Set();
    const pendingVars=[...variableRefs];
    const pendingObjects=[];
    const appendObjectRefs=node=>{
      for(const id of findRefs(node,"object"))if(a.shared_objects[id])pendingObjects.push(id);
      for(const id of findRefs(node,"in"))if(a.shared_objects[id])pendingObjects.push(id);
    };
    appendObjectRefs(t);
    while(pendingVars.length){
      const id=pendingVars.pop();if(seenVars.has(id))continue;seenVars.add(id);
      const v=a.variables?.[id];if(!v)continue;
      appendObjectRefs(v);
      for(const dep of findRefs(v,"variable"))if(!seenVars.has(dep))pendingVars.push(dep);
    }
    const seenObjects=new Set();
    while(pendingObjects.length){
      const id=pendingObjects.pop();if(seenObjects.has(id))continue;seenObjects.add(id);
      const o=a.shared_objects[id];if(o)appendObjectRefs(o);
    }
    if(!seenObjects.size)return "";
    return '<details class="dependency-group"><summary>Other data sources this check depends on (shared_objects: '+seenObjects.size+')</summary><p class="help">These Objects feed collections. They are not extra AND/OR Tests.</p><div class="structure-children">'+[...seenObjects].map(id=>{
      const o=a.shared_objects[id];
      return '<details class="structure-node"><summary>'+esc(o?.object_title||id)+' <small>'+esc(id)+'</small></summary>'+
        (o?walk(o,["assessment","shared_objects",id],"object"):'<p class="warning">Definition unavailable</p>')+'</details>';
    }).join("")+'</div></details>';
  }
  // Semantic presentation: this is one authored check, not two independent rules.
  // Every editable control below still addresses its original YAML path.
  function humanCollection(a,t){
    const ref=typeof t.object==="string"?t.object:null;
    const o=ref?a.shared_objects?.[ref]:t.object;
    const capability=t.capability||o?.capability||"unspecified capability";
    if(!o||typeof o!=="object")return {text:"Referenced data source "+(ref||"not loaded"),detail:"Unresolved Object reference"};
    const humanCaps={
      "linux.partition":"mounted filesystem entries",
      "unix.file":"filesystem entries",
      "windows.registry":"Windows Registry entries",
      "windows.userright":"Windows user-right assignments",
      "windows.wmi.query":"Windows system information",
      "independent.shellcommand":"command output"
    };
    const source=humanCaps[capability]||capability+" results";
    if(o.select&&typeof o.select==="object"){
      const selectors=Object.entries(o.select);
      const where=selectors.slice(0,3).map(([name,pred])=>shortClause(pred,name)).filter(Boolean);
      const more=selectors.length>3?" and "+(selectors.length-3)+" additional selection criteria (expand details)":"";
      return {text:source+(where.length?" matching "+where.join(" and "):"")+more,detail:ref?"Shared source: "+ref:"Local source"};
    }
    if(o.collect?.query)return {text:source+" queried with "+o.collect.query,detail:ref?"Shared source: "+ref:"Local source"};
    if(o.collect?.command){
      const cmd=o.collect.command;
      const title=typeof cmd==="object"&&cmd.variable?a.variables?.[cmd.variable]?.title||cmd.variable:null;
      return {text:source+" gathered by "+(title?"a command assembled from "+title:typeof cmd==="string"?"the command shown below":"an authored command expression"),detail:ref?"Shared source: "+ref:"Local source"};
    }
    if(o.set)return {text:source+" derived from a "+String(o.set.operator||"specified")+" set of collections; see source dependencies",detail:ref?"Shared source: "+ref:"Local source"};
    if(o.for_each)return {text:source+" collected for each "+String(o.for_each.item||"item")+" from "+String(o.for_each.in||"the referenced source"),detail:ref?"Shared source: "+ref:"Local source"};
    return {text:source+(o.object_title?" ("+o.object_title+")":""),detail:ref?"Shared source: "+ref:"Local source"};
  }
  function simpleMatchShape(t){
    if(!Array.isArray(t.states)||t.states.length!==1)return null;
    const state=t.states[0];
    if(!state||typeof state!=="object"||Array.isArray(state))return null;
    const parts=Object.entries(state);
    if(parts.length!==1)return null;
    const [name,matcher]=parts[0];
    if(!matcher||typeof matcher!=="object"||Array.isArray(matcher)||matcher.record||matcher.and||matcher.or)return null;
    const comparisons=["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"];
    const present=comparisons.filter(k=>Object.hasOwn(matcher,k));
    if(present.length!==1||matcher[present[0]]===null||typeof matcher[present[0]]==="object")return null;
    return {name,matcher,op:present[0],value:matcher[present[0]]};
  }
  function shortRequireChoice(k){
    const names={
      at_least_one_exists_and_all_match:"One or more found; all match",
      at_least_one_exists_and_some_match:"One or more found; at least one matches",
      at_least_one_exists_and_only_one_matches:"One or more found; exactly one matches",
      only_one_exists_and_matches:"Exactly one found and it matches",
      none_exist:"No results allowed",
      none_match:"No results may match",
      may_be_absent_and_all_match:"May be absent; all found must match"
    };
    return names[k]||"Unrecognized: "+String(k);
  }
  function requirementSelect(path,value,description){
    if(value===undefined||value===null)return '<p class="warning">No authored '+esc(description)+' option. Use detailed source editing; none is assumed.</p>';
    const enc=encodeURIComponent(JSON.stringify(path));
    const options=[...new Set([value,...levels])].map(k=>'<option value="'+esc(k)+'" '+(k===value?"selected":"")+'>'+esc(shortRequireChoice(k))+'</option>').join("");
    return '<select class="quick-require-select" data-field="'+enc+'" aria-label="'+esc(description)+'">'+options+'</select>';
  }
  function replaceSimpleOperator(tree,base,newOp){
    const current=getNode(tree,base);
    if(!current||typeof current!=="object"||Array.isArray(current))throw Error("Matching field is no longer present.");
    const comparisons=["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"];
    const found=comparisons.filter(k=>Object.hasOwn(current,k));
    if(found.length!==1)throw Error("Multiple or unsupported comparisons: use source editing.");
    const previous=found[0],value=current[previous];
    const supported=typeof value==="number"?["equals","greater_than","greater_than_or_equal","less_than","less_than_or_equal"]:
      typeof value==="string"?["equals","case_insensitive_equals","matches_regex"]:["equals"];
    if(!supported.includes(newOp))throw Error("This comparison is not supported for the current value type.");
    if(previous===newOp)return previous;
    const newField={};
    for(const [key,v] of Object.entries(current))newField[key===previous?newOp:key]=v;
    putNode(tree,base,newField);
    return previous;
  }
  function oneFieldEditor(id,t){
    const shape=simpleMatchShape(t);
    if(!shape)return "";
    const {name,matcher,op,value}=shape;
    const base=["assessment","tests",id,"states",0,name];
    const isNumeric=typeof value==="number";
    const isBool=typeof value==="boolean";
    const allowed=isBool?["equals"]:isNumeric?["equals","greater_than","greater_than_or_equal","less_than","less_than_or_equal"]:
      ["equals","case_insensitive_equals","matches_regex"];
    // Other/unknown source operators remain readable; never remove an unsupported operator.
    if(!allowed.includes(op))allowed.unshift(op);
    const comparisonLabels={
      equals:"Equals",
      case_insensitive_equals:"Equals (ignoring case)",
      matches_regex:"Matches regular expression",
      greater_than:"Is greater than",
      greater_than_or_equal:"Is at least",
      less_than:"Is less than",
      less_than_or_equal:"Is at most"
    };
    const opChoices=allowed.map(k=>'<option value="'+esc(k)+'" '+(k===op?"selected":"")+'>'+esc(comparisonLabels[k]||k)+'</option>').join("");
    const fieldPath=encodeURIComponent(JSON.stringify(base.concat(op)));
    const opPath=encodeURIComponent(JSON.stringify(base));
    const input=isBool?'<span class="help">Boolean comparison; use Source to change the value.</span>':
      '<input id="predicate-value" type="text" class="predicate-value" data-field="'+fieldPath+'" value="'+esc(String(value))+'" aria-label="Expected value for '+esc(name)+'" spellcheck="false">';
    return '<div class="inline-predicate" aria-label="Edit expected condition">'+
      '<div class="predicate-heading">Check (State)</div>'+
      '<div class="predicate-grid">'+
      '<div class="predicate-part"><label>Field</label><code class="field-name">'+esc(name)+'</code></div>'+
      '<div class="predicate-part"><label for="predicate-operation">Must</label><select id="predicate-operation" data-operation="'+opPath+'" aria-label="Comparison for '+esc(name)+'">'+opChoices+'</select></div>'+
      '<div class="predicate-part"><label for="predicate-value">Value</label>'+input+'</div>'+
      '</div>'+
      (matcher.require?'<div class="predicate-quantity"><label>How many field values in each result must match? (require)</label>'+
        requirementSelect(base.concat("require"),matcher.require,"Field-value matching requirement")+'</div>':
        '')+
      ''+
      '</div>';
  }
  // Applies at the Test's collected-Item population, not to State fields.
  // Never use these English sentences as substitute serialized schema values.
  function resultCountExplanation(requirement){
    const counts={
      at_least_one_exists_and_all_match:{
        found:"At least one result.",
        match:"Every result found must satisfy the requirements above."
      },
      at_least_one_exists_and_some_match:{
        found:"At least one result.",
        match:"At least one of the results must satisfy the requirements above."
      },
      at_least_one_exists_and_only_one_matches:{
        found:"At least one result.",
        match:"Exactly one of the results must satisfy the requirements above."
      },
      only_one_exists_and_matches:{
        found:"Exactly one result.",
        match:"That single result must satisfy the requirements above."
      },
      none_exist:{
        found:"No results.",
        match:"No matching comparison is needed when no results are permitted."
      },
      none_match:{
        found:"Not specified by this matching requirement.",
        match:"None of the results may satisfy the requirements above."
      },
      may_be_absent_and_all_match:{
        found:"No minimum; finding none is allowed.",
        match:"If any results are found, every result must satisfy the requirements above."
      }
    };
    return counts[requirement]||{
      found:"Review the exact requirement in the expanded details.",
      match:"This editor has no reviewed plain-English wording for this option."
    };
  }
  // Explain the exact authored collection command without attempting execution,
  // variable substitution, shell expansion, or evaluation.
  function shellCommandDetails(a,id,t){
    const objectRef=typeof t.object==="string"?t.object:null;
    const o=objectRef?a.shared_objects?.[objectRef]:t.object;
    if(t.capability!=="independent.shellcommand"&&o?.capability!=="independent.shellcommand")return "";
    const command=o?.collect?.command,shell=o?.collect?.shell;
    const shellPath=objectRef?["assessment","shared_objects",objectRef,"collect","shell"]:
      ["assessment","tests",id,"object","collect","shell"];
    const header='<div class="shellcommand-panel"><div class="shellcommand-heading">Command used to collect the data <small>(shellcommand)</small></div>'+
      shellInterpreterControl(shellPath,shell,a.specification?.version);
    if(typeof command==="string"){
      const base=objectRef?["assessment","shared_objects",objectRef,"collect","command"]:["assessment","tests",id,"object","collect","command"];
      const path=encodeURIComponent(JSON.stringify(base));
      return header+'<label class="help" for="authored-command">Authored command string (editable draft)</label>'+
        '<textarea id="authored-command" class="command-editor" spellcheck="false" data-field="'+path+'" aria-label="Collection command string">'+esc(command)+'</textarea>'+
        '<p class="help">This is the exact authored command, not something the editor has executed. Changing it currently reformats the exported YAML; review the source before use.</p></div>';
    }
    if(command&&typeof command==="object"&&typeof command.variable==="string"){
      const name=command.variable,v=a.variables?.[name];
      return header+'<p>There is <strong>no fixed command string</strong> in this Test. The command comes from the Variable <code>'+esc(name)+'</code>'+(v?.title?' ('+esc(v.title)+')':"")+'.</p>'+
        '<p class="help">The runtime command depends on the Variable expression and any collected values. This editor does not resolve or execute it.</p>'+
        (v?'<details class="structure-node"><summary>Show how the command is constructed</summary><div class="structure-children">'+
          walk(v.expression,["assessment","variables",name,"expression"],"expression")+
          '</div></details>':'<p class="warning">Referenced command Variable was not found in this Assessment.</p>')+
        '</div>';
    }
    return header+'<p class="warning">No directly displayable command string is present. Inspect the complete collection source below.</p></div>';
  }
  function combinedReading(a,id,t){
    const from=humanCollection(a,t),shape=simpleMatchShape(t),counts=resultCountExplanation(t.collected_items_require);
    const mode=t.states_match==="any"?"At least one alternative must match":t.states_match==="all"?"All alternatives must match":t.states_match==="none"?"No alternative may match":t.states_match==="one"?"Exactly one alternative must match":"State combination shown in details";
    return '<section class="combined-check" aria-label="Readable test description">'+
      '<h4>What this check means</h4>'+
      '<p class="check-sentence"><strong>Look at</strong> '+esc(from.text)+'. <small>'+esc(from.detail)+'</small></p>'+
      shellCommandDetails(a,id,t)+
      (shape?oneFieldEditor(id,t):
        '<div class="condition-readonly"><strong>Conditions (States)</strong><p>'+esc(summarizeTest(t))+'</p><p class="help">Open full details to edit nested conditions.</p></div>')+
      '<div class="quick-results"><label>How many results must be found and match? (collected_items_require)</label>'+
      requirementSelect(["assessment","tests",id,"collected_items_require"],t.collected_items_require,"Results that must be found and match")+
      '<details class="result-explanation"><summary>What does this mean?</summary>'+
      '<p><strong>Must be found:</strong> '+esc(counts.found)+'</p>'+
      '<p><strong>Must match:</strong> '+esc(counts.match)+'</p>'+
      '<p class="help">These counts apply to results from “Look at.”</p></details>'+
      '</div>'+
      (t.states_match?'<p class="help">Alternatives: '+esc(mode)+' (states_match)</p>':"")+
      (t.state_fields_require?'<p class="help">State fields: '+esc(requirementDescription(t.state_fields_require))+' (state_fields_require)</p>':"")+
      
      '</section>';
  }
  function inspector(a,id,refs){
    const t=a.tests?.[id];
    if(!t)return '<section class="card" id="test-inspector"><h3>Select a Test</h3><p>Choose a leaf in the logic tree to inspect its collection and expectations.</p></section>';
    const path=["assessment","tests",id],o=t.object;
    const shared=typeof o==="string"?a.shared_objects?.[o]:null;
    let states=t.states||[];
    return '<section class="card test-inspector" id="test-inspector"><div class="inspector-eyebrow">FOCUSED CHECK (Test) · '+esc(id)+'</div><h3>'+esc(t.test_title||id)+'</h3>'+
      (refs[id]>1?'<p class="reference-note">Reused check: '+refs[id]+' references in the logic tree; edits affect one Test definition.</p>':"")+
      combinedReading(a,id,t)+
      '<div class="unimplemented-actions"><button type="button" disabled title="Requires source-preserving structural editing">+ Add a condition</button><button type="button" disabled title="Requires dependency-safe unlink/delete">Remove / unlink</button><span>Safe structural changes are planned; source editing remains available.</span></div>'+
      '<details class="inspector-section"><summary>Show the full collection and matching details (Object + States)</summary><div class="structure-children">'+
      '<h4>Where the information comes from (Object)</h4>'+
      (typeof o==="string"?'<p class="reference-note">Uses shared source <code>'+esc(o)+'</code>. Collection dependencies are not additional AND conditions.</p>'+(shared?walk(shared,["assessment","shared_objects",o],"object"):'<p class="warning">Shared source definition was not found.</p>'):walk(o,path.concat("object"),"object"))+
      '<h4>Conditions applied to the information (States: '+states.length+')</h4>'+
      walk(states,path.concat("states"),"States")+
      '</div></details>'+
      '<details class="inspector-section"><summary>Precise matching requirements (advanced)</summary><div class="structure-children">'+
      field(path.concat("collected_items_require"),"Which collected entries must match? (collected_items_require)",t.collected_items_require,levels)+
      field(path.concat("states_match"),"How alternatives combine (states_match)",t.states_match,["all","any","none","one"])+
      field(path.concat("state_fields_require"),"Which expected fields must match? (state_fields_require)",t.state_fields_require,levels)+
      field(path.concat("reported_elements"),"What details should be reported? (reported_elements)",t.reported_elements)+
      '</div></details>'+objectTrace(a,t)+variableTrace(a,t)+
      '</section>';
  }
  function overview(){
    const a=doc().tree.assessment,refs={};countTestReferences(a.evaluate,refs);
    if(!selectedTest||!a.tests?.[selectedTest])selectedTest=Object.keys(refs).find(k=>a.tests?.[k])||Object.keys(a.tests||{})[0]||null;
    const unreferenced=Object.keys(a.tests||{}).filter(k=>!refs[k]);
    return '<section class="card"><h3>Assessment logic · '+esc(a.id)+'</h3><p>'+esc(a.assessment_title)+'</p><p class="help">Pinned source version '+esc(a.specification?.version||"unspecified")+' · Explanation of authored logic only · NOT SCANNER-VERIFIED</p></section>'+
      '<div class="graph-layout"><section class="card logic-pane"><h3>1 · How the checks work together (evaluate)</h3><p class="help">Expand a branch. Select any Test to inspect it alongside the tree.</p>'+
      logic(a.evaluate,a,refs)+
      (unreferenced.length?'<details class="dependency-group"><summary>Unreferenced Test definitions ('+unreferenced.length+')</summary><div class="structure-children">'+unreferenced.map(id=>'<button class="logic-leaf" data-select-test="'+esc(id)+'">'+esc(a.tests[id].test_title||id)+'</button>').join("")+'</div></details>':"")+
      '</section>'+inspector(a,selectedTest,refs)+'</div>'+
      '<section class="card"><h3>Future sample evaluation — placement only</h3><p class="help">The future tested SCAP-NG interpreter will take supplied Items / field values and source statuses, then explain six-state outcomes for each Test and branch. Evaluation is not connected; no result is inferred here.</p><button class="button" disabled>Enter sample evidence (not connected)</button> <button class="button" disabled>Evaluate with scanner (not connected)</button></section>';
  }
  function wizard(){
    const a=doc().tree.assessment,tests=Object.entries(a.tests||{});
    const names=["Purpose","Collect data","What must match","Combine checks","Example data (future)"];
    let header='<div class="steps">'+names.map((n,i)=>'<button data-step="'+i+'" class="'+(step===i?"selected":"")+'">'+(i+1)+". "+n+'</button>').join("")+'</div>';
    let content="";
    if(step===0)content='<section class="card"><h3>1 · Understand this requirement</h3><p>'+esc(a.assessment_title)+'</p><p>Rule: <b>'+esc(chosen)+'</b> · Assessment: '+esc(a.id)+'</p><p class="help">The current source is the starting choice; an AI is not silently changing it.</p></section>';
    if(step===1)content='<section class="card"><h3>2 · What data should we examine? (Object)</h3><p>Edit collection and Item matching requirements. Changing a value updates the editable source draft.</p></section>'+
      tests.map(([id,t])=>'<section class="card"><h3>'+esc(id)+'</h3><p>Capability: '+esc(t.capability)+'</p>'+
      field(["assessment","tests",id,"collected_items_require"],"Which collected entries must match? (collected_items_require)",t.collected_items_require,levels)+
      (typeof t.object==="object"?walk(t.object,["assessment","tests",id,"object"],"Object"): '<p>Shared Object: '+esc(t.object)+'</p>')+'</section>').join("");
    if(step===2)content='<section class="card"><h3>3 · What must be true of the collected data? (States)</h3><p>Existence and matching are separate concerns; every nested record remains visible.</p></section>'+
      tests.map(([id,t])=>'<section class="card"><h3>'+esc(t.test_title||id)+'</h3>'+walk(t.states||[],["assessment","tests",id,"states"],"State")+'</section>').join("");
    if(step===3)content='<section class="card"><h3>4 · How the checks work together (evaluate)</h3><p>Read the exact OR/AND tree. Restructuring expressions is available in Source view; graphical restructuring is not yet implemented.</p>'+logic(a.evaluate)+'</section>';
    if(step===4)content=fixtures();
    return header+content+'<div class="actions">'+(step>0?'<button class="button" id="prev">Previous</button>':'')+(step<4?'<button class="button primary" id="next">Accept current & continue →</button>':'<button class="button primary" id="gotoSource">Review source</button>')+'<button class="button" id="gotoGraph">Graphical view</button></div>';
  }
  function fixtures(){
    return '<section class="card"><h3>Future sample evidence workbench</h3><p>Planned flow: enter/import typed Items and field values → provide source status → evaluate with the tested SCAP-NG interpreter → inspect the per-Test, per-branch six-state trace.</p><p class="warning">NOT CONNECTED: sample collection/evaluation controls remain disabled until a verified interpreter is integrated.</p><div class="sample-mock"><label>Sample Item / source status</label><textarea disabled rows="3" placeholder="Future typed sample evidence"></textarea><label>Evaluation trace</label><pre>Result unavailable — scanner not connected</pre><button class="button" disabled>Evaluate sample</button></div></section>';
  }
  function rawEditor(){return '<div class="card"><h3>YAML source</h3><p class="help">Original source is preserved until you edit. Structured edits reserialize YAML and may change formatting; export and review diffs carefully.</p><textarea id="rawyaml" class="editor" spellcheck="false">'+esc(doc().source)+'</textarea><div class="actions"><button id="applyYAML" class="button primary">Apply YAML to other views</button><span id="rawStatus" class="help">Source and graphical views synchronized</span></div></div>'}
  function sourceView(){return rawEditor()}
  function showManualAssessment(r,d){
    const a=d.tree.assessment;
    const choices=(a.response?.choices||[]).map(x=>'<span class="tag">'+esc(x.label||x.value||"Unknown")+'</span>').join("");
    const procedure=typeof a.procedure==="string"?a.procedure:"No procedure text in the selected source.";
    return '<section class="card manual-assessment"><h3>Manual assessment</h3>'+
      '<p class="help">No automated Assessment choice is present in this source Rule. This does not prove automation is impossible.</p>'+
      '<h4>How to check compliance</h4>'+
      '<textarea id="manual-procedure" class="manual-procedure" aria-label="Manual check procedure">'+esc(procedure)+'</textarea>'+
      '<p class="help">Editing changes the local YAML draft; review the source before exporting.</p>'+
      '<details class="inspector-section"><summary>Allowed responses and evidence options</summary><div class="structure-children">'+
      '<p>'+choices+'</p><p>Comments: '+(a.response?.allow_comment?"Allowed":"Not enabled")+
      ' · Evidence: '+(a.response?.allow_evidence?"Allowed":"Not enabled")+'</p></div></details>'+
      '</section>';
  }
  function render(){
    const r=active();tabs();
    if(!r){$("crumb").textContent="LOCAL BROWSER WORKSPACE";$("title").textContent="SCAP-NG Assessment Studio";$("content").innerHTML='<section class="card"><h3>Select a STIG, then a Rule</h3><p>Expand a STIG on the left to view its Rules. No scanner is connected.</p></section>';return}
    $("crumb").textContent=r.id+' · '+(r.version||"source revision not specified");
    $("title").textContent=r.title;
    $("state").textContent="No scanner connected";
    const d=doc();
    if(!d){
      const manual=manualDoc();
      if(manual){
        $("notice").textContent="Manual Assessment from pinned source · scanner not connected.";
        $("content").innerHTML=view==="source"?'<div class="card"><h3>Manual YAML source</h3><textarea id="rawyaml" class="editor" spellcheck="false">'+esc(manual.source)+'</textarea><div class="actions"><button id="applyYAML" class="button primary">Apply YAML</button><span id="rawStatus" class="help">Draft source</span></div></div>':showManualAssessment(r,manual);
        const editor=$("manual-procedure");
        if(editor)editor.onchange=()=>{
          const previous=manual.tree.assessment.procedure;
          manual.tree.assessment.procedure=editor.value;
          try{manual.source=jsyaml.dump(manual.tree,{lineWidth:105,noRefs:true});manual.changed=true;saveState();display("Manual procedure updated in draft — review YAML before export.");render()}
          catch(err){manual.tree.assessment.procedure=previous;display(err.message,true)}
        };
        const raw=$("rawyaml");
        if(raw){raw.oninput=()=>{$("rawStatus").textContent="Unapplied changes";dirtySource=true};
          $("applyYAML").onclick=()=>{
            try{const p=parse(raw.value);if(p.kind!=="assessment"||p.id!==manual.id)throw Error("Manual Assessment identity must not change");
              manual.tree=p.tree;manual.source=raw.value;manual.changed=true;dirtySource=false;saveState();render();display("Manual Assessment updated from source.")}
            catch(err){display("Source error: "+err.message,true)}
          }}
        return;
      }
      const linked=Boolean(r.aid);
      $("content").innerHTML='<section class="card"><h3>'+esc(linked?"Automated Assessment source not loaded":"No automated Assessment selected")+'</h3>'+
        '<p>'+esc(linked?"The Rule references "+r.aid+", but its source is not in the current library. This is not evidence that the Rule is manual-only.":"This loaded Rule has no automated Assessment choice.")+'</p>'+
        '<p>'+esc(linked?"Import the referenced Assessment YAML to inspect its Tests; references are never silently replaced.":"You can propose automation or import an Assessment.")+'</p>'+
        (linked?'':'<button id="suggest" class="button">Mark as proposed automation candidate</button>')+'</section>';
      if(!linked)$("suggest").onclick=()=>{const why=prompt("Reviewer rationale for possible automation (proposal only)");if(why){candidate.set(r.id,why);library();display("Candidate proposal saved in browser session")}};
      return;
    }
    $("notice").textContent=(r.status==="needs-review"?r.reason+" · ":"")+"Imported source: "+d.origin+" · Draft-only. No authoritative schema verification or scanner evaluation.";
    let html=view==="guided"?wizard():view==="graphical"?overview():view==="source"?sourceView():view==="split"?'<div class="split"><div>'+overview()+'</div>'+rawEditor()+'</div>':fixtures();
    $("content").innerHTML=html;
    $("content").querySelectorAll("[data-select-test]").forEach(b=>b.onclick=()=>{selectedTest=b.dataset.selectTest;render();if(innerWidth<780)$("test-inspector")?.scrollIntoView({block:"start"})});
    $("content").querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{step=Number(b.dataset.step);render()});
    $("content").querySelectorAll("[data-field]").forEach(e=>e.onchange=()=>{
      const path=JSON.parse(decodeURIComponent(e.dataset.field));
      let d=doc(),v=e.value;
      const orig=getNode(d.tree,path);
      const isShell=path.length>=3&&path[path.length-2]==="collect"&&path[path.length-1]==="shell";
      if(isShell){
        if(typeof orig!=="string"||!shellChoices||shellChoicesVersion!==d.tree.assessment?.specification?.version||
           !shellChoices.includes(orig)||!shellChoices.includes(v)){
          display("Interpreter not changed: choose a supported value from the pinned capability list.",true);render();return;
        }
        if(v===orig)return;
        if(!confirm("Change interpreter from "+orig+" to "+v+"? The command is not converted and may need changes.")){render();return}
      }
      if(typeof orig==="number"){const n=Number(v);if(!Number.isFinite(n)){display("Invalid number",true);return}v=n}
      putNode(d.tree,path,v);
      try{d.source=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});d.changed=true;saveState();display("Draft changed at "+path.slice(-3).join(" / ")+" — YAML reformatted; review before export");render()}catch(ex){putNode(d.tree,path,orig);display(ex.message,true)}
    });
    $("content").querySelectorAll("[data-operation]").forEach(e=>e.onchange=()=>{
      const base=JSON.parse(decodeURIComponent(e.dataset.operation)),d=doc();
      const existing=getNode(d.tree,base),old=existing&&Object.keys(existing).find(k=>
        ["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"].includes(k));
      if(!old||old===e.value){render();return}
      if(!confirm("Change the comparison from "+old+" to "+e.value+"? This changes the meaning of the check. The browser demo cannot yet validate against a tested SCAP-NG scanner.")){render();return}
      const previous=structuredClone(existing);
      try{
        replaceSimpleOperator(d.tree,base,e.value);
        const next=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});
        parse(next);
        d.source=next;d.changed=true;saveState();
        display("Comparison changed in draft — unverified; YAML formatting may change. Review the source before export.");
        render();
      }catch(err){
        putNode(d.tree,base,previous);display("Comparison not changed: "+err.message,true);render();
      }
    });
    const raw=$("rawyaml");
    if(raw){raw.oninput=()=>{$("rawStatus").textContent="Unapplied changes — apply before switching";dirtySource=true};
      $("applyYAML").onclick=()=>{try{const p=parse(raw.value),d=doc();if(p.kind!=="assessment"||p.id!==d.id)throw Error("Assessment id must stay "+d.id+" in this demo");d.tree=p.tree;d.source=raw.value;d.changed=true;dirtySource=false;saveState();indexRules();library();display("Source parsed and graphical views updated");render()}catch(ex){display("Source error: "+ex.message,true);$("rawStatus").textContent=ex.message}}}
    const p=$("prev");if(p)p.onclick=()=>{step--;render()};
    const n=$("next");if(n)n.onclick=()=>{step++;render()};
    const x=$("gotoSource");if(x)x.onclick=()=>setView("source");
    const y=$("gotoGraph");if(y)y.onclick=()=>setView("graphical");
    const fixture=$("sampleText");
    if(fixture)fixture.oninput=()=>{sampleText=fixture.value};
    const exportSample=$("exportSample");if(exportSample)exportSample.onclick=()=>{try{const s=$("sampleText").value;JSON.parse(s);sampleText=s;download(r.id+"-synthetic-sample.json",s,"application/json");display("Synthetic sample downloaded — no scanner execution performed")}catch(e){display("Sample JSON invalid: "+e.message,true)}};
  }
  function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name.replace(/[^a-zA-Z0-9_.-]/g,"_");document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
  $("query").oninput=e=>{search=e.target.value.toLowerCase();expandedStig=null;chosen=null;selectedTest=null;library();render()};
  $("tabs").querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $("import").onclick=()=>$("upload").click();
  $("upload").onchange=async e=>{
    let imported=0;
    for(const file of Array.from(e.target.files)){try{addDoc(file.name,await file.text(),"Local import",false,file.webkitRelativePath||null);imported++}catch(err){display(file.name+": "+err.message,true)}}
    e.target.value="";indexRules();library();saveState();if(!chosen&&ruleRows.length)open(ruleRows[0].id);else render();
    if(imported)display("Imported "+imported+" source document(s). This is a local browser draft.");
  };
  $("export").onclick=()=>{const d=doc()||manualDoc();if(!d)return;let raw=$("rawyaml");if(raw&&raw.value!==d.source){display("Apply source edits before exporting",true);return}download(d.name,d.source,"text/yaml");display("YAML downloaded to your device")};
  $("original").onclick=()=>{const d=doc()||manualDoc();if(d&&confirm("Restore this Assessment to its original loaded source?")){const p=parse(d.original);d.source=d.original;d.tree=p.tree;d.changed=false;saveState();indexRules();library();render();display("Original restored.")}};
  async function init(){
    if(!window.jsyaml){display("YAML parser asset did not load — app cannot parse files.",true);return}
    display("Loading six pinned source-backed Rule/Assessment examples from public GitHub…");
    const capabilityLoad=loadShellVocabulary();
    const got=await Promise.all(seeded.map(async ([path])=>{
      try{const url=src+path;const res=await fetch(url,{cache:"force-cache"});if(!res.ok)throw Error("HTTP "+res.status);return {name:path.split("/").pop(),text:await res.text(),url,path}}
      catch(e){return {err:path+": "+e.message}}
    }));
    let failures=[];
    for(const item of got){if(item.err){failures.push(item.err);continue}try{addDoc(item.name,item.text,"Pinned source "+snap.slice(0,10),false,item.path)}catch(e){failures.push(item.name+": "+e.message)}}
    await Promise.all([capabilityLoad,loadCompleteCatalog()]);
    readState();indexRules();chosen=null;expandedStig=null;library();render();
    display(catalogStatus+(failures.length?" Some sample fixtures unavailable: "+failures[0]:""),!!failures.length);
  }
  init();
})();
