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
  let docs=new Map(),ruleRows=[],chosen=null,standaloneId=null,creatingStandalone=false,selectedTest=null,view="graphical",step=0,filter="all",search="",message="",dirtySource=false,newCreateMode="blank";
  // Only one STIG can reveal its Rules. Others have no Rule DOM nodes.
  let expandedStig=null;
  const stigScrollPositions=new Map();
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
  // Key renames (including record member names) must preserve sibling entries and
  // their values. Unlike putNode, this replaces the mapping key, not its value.
  function renameMappingKey(tree,path,nextName){
    const parentPath=path.slice(0,-1),oldName=path[path.length-1];
    const mapping=getNode(tree,parentPath);
    if(!mapping||typeof mapping!=="object"||Array.isArray(mapping)||!Object.hasOwn(mapping,oldName))
      throw Error("Field name is no longer present in the source.");
    const proposed=String(nextName).trim();
    if(!proposed)throw Error("Field name cannot be empty.");
    if(Object.hasOwn(mapping,proposed)&&proposed!==oldName)
      throw Error("A field named "+proposed+" already exists at this level.");
    if(proposed===oldName)return false;
    putNode(tree,parentPath,Object.fromEntries(Object.entries(mapping).map(([name,value])=>[name===oldName?proposed:name,value])));
    return true;
  }
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
      if(Array.isArray(stored))for(const d of stored){try{const key=addDoc(d.name,d.source,"Local browser draft",true,d.sourcePath||null);docs.get(key).guidedGeneric=d.guidedGeneric===true;docs.get(key).guidedPlatform=["linux","windows"].includes(d.guidedPlatform)?d.guidedPlatform:null}catch(e){}}
    }catch(e){}
  }
  function saveState(){
    try{localStorage.setItem("scapng-browser-drafts-v1",JSON.stringify([...docs.values()].filter(d=>d.origin==="Local import"||d.origin==="Locally created draft"||d.origin==="Local browser draft"||d.changed).map(d=>({name:d.name,source:d.source,sourcePath:d.sourcePath,guidedGeneric:d.guidedGeneric===true,guidedPlatform:d.guidedPlatform||null}))))}catch(e){}
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
  const doc=()=>standaloneId?docs.get("assessment:"+standaloneId):active()?.linked;
  const manualDoc=()=>active()?.manualId?docs.get("assessment:"+active().manualId):null;
  function display(txt,bad=false){message=txt;$("status").textContent=txt;$("status").className=bad?"warning":""}
  function flag(r){
    if(candidate.has(r.id))return '<span class="tag orange">AI candidate? Human proposal only</span>';
    if(r.status==="automated")return '<span class="tag green">Automated Assessment</span>';
    if(r.status==="needs-review")return '<span class="tag orange" title="'+esc(r.reason||"Assessment source unavailable")+'">Assessment reference unresolved</span>';
    return '<span class="tag orange">No automation link in loaded Rule</span>';
  }
  function library(){
    for(const section of $("rules").querySelectorAll(".stig-group")){
      const key=section.querySelector("[data-stig]")?.dataset.stig;
      const list=section.querySelector(".stig-rules");
      if(key&&list)stigScrollPositions.set(key,list.scrollTop);
    }
    const personal=[...docs.values()].filter(d=>d.kind==="assessment"&&
      ["Locally created draft","Local browser draft","Local import"].includes(d.origin));
    $("my-assessments").innerHTML=personal.length?personal.map(d=>
      '<button type="button" class="personal-assessment '+(standaloneId===d.id?"active":"")+'" data-standalone="'+esc(d.id)+'">'+
      esc(d.tree.assessment.assessment_title||d.id)+'</button>').join(""):'<p class="help">No personal Assessments yet.</p>';
    $("my-assessments").querySelectorAll("[data-standalone]").forEach(b=>b.onclick=()=>{
      standaloneId=b.dataset.standalone;creatingStandalone=false;chosen=null;selectedTest=null;view="guided";step=0;library();render();
    });
    const choices=[["all","All"],["automated","Automated"],["not-automated","Without automated choice"],["needs-review","Assessment not loaded"],["candidates","Candidates"]];
    $("filters").innerHTML=choices.map(([v,name])=>'<button class="'+(filter===v?"selected":"")+'" data-filter="'+v+'">'+name+'</button>').join("");
    $("filters").querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{
      filter=b.dataset.filter;
      if(filter==="all"){search="";$("query").value=""}
      expandedStig=null;chosen=null;standaloneId=null;creatingStandalone=false;selectedTest=null;
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
    $("counter").textContent=groups.length+" STIGs · "+matches.length+" of "+ruleRows.length+" loaded Rules · pre-alpha research corpus";
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
    for(const section of $("rules").querySelectorAll(".stig-group")){
      const key=section.querySelector("[data-stig]")?.dataset.stig;
      const list=section.querySelector(".stig-rules");
      if(key&&list)list.scrollTop=stigScrollPositions.get(key)||0;
    }
    $("rules").querySelectorAll("[data-stig]").forEach(b=>b.onclick=()=>{
      expandedStig=expandedStig===b.dataset.stig?null:b.dataset.stig;
      chosen=null;standaloneId=null;creatingStandalone=false;selectedTest=null;
      library();render();
    });
    $("rules").querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>open(b.dataset.id));
  }
  function ruleNavigation(r){
    const same=ruleRows.filter(x=>x.stig.key===r.stig.key);
    const pos=same.findIndex(x=>x.id===r.id);
    if(pos<0)return "";
    const prev=same[pos-1],next=same[pos+1];
    return '<nav class="rule-navigation" aria-label="Browse STIG Rules">'+
      '<button class="button" data-nav-rule="'+esc(prev?.id||"")+'" '+(prev?"":"disabled")+'>← Previous Rule</button>'+
      '<span>Rule '+(pos+1)+' of '+same.length+'</span>'+
      '<button class="button" data-nav-rule="'+esc(next?.id||"")+'" '+(next?"":"disabled")+'>Next Rule →</button>'+
      '</nav>';
  }
  function bindRuleNavigation(){
    $("content").querySelectorAll("[data-nav-rule]").forEach(b=>b.onclick=()=>{if(b.dataset.navRule)open(b.dataset.navRule)});
  }
  async function open(id){
    standaloneId=null;creatingStandalone=false;chosen=id;expandedStig=ruleRows.find(r=>r.id===id)?.stig.key||null;
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
    if(Array.isArray(opts)&&opts===levels&&!levels.includes(v))
      return '<div class="property"><label>'+esc(name)+'</label><p class="help">Special authored requirement: <code>'+esc(v)+'</code>. Use Source for this unsupported quick-edit option.</p></div>';
    const optionLabel=x=>levels.includes(x)?(name.includes("collected_items_require") && x==="at_least_one_exists_and_all_match" ? "At least one item exists; all items must pass" : name.includes("collected_items_require") && x==="may_be_absent_and_all_match" ? "Items may be absent; all items found must pass" : requirementDescription(x))+" ("+x+")":
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
    require:"How many must exist and match?",
    for_each:"Repeat this check for each entry (for_each)",
    fields:"Fields inside this record (fields)",
    object:"Where to look",
    set:"How collections are combined (set)",
    operands:"Collections to combine (operands)",
    filters:"Which collected entries are included or excluded? (filters)",
    select:"Choose what to examine",
    collect:"How the data is collected (collect)",
    expression:"How this value is calculated (expression)",
    state:"Expected condition",
    states:"What must be true",
    and:"All of these must be true (and)",
    or:"At least one of these must be true (or)",
    record:"Structured value with named fields (record)",
    canonical_path:"Resolved symlink destination"
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
    return prettyName(String(name))+" "+prettyName(key)+" "+(value&&typeof value==="object"?"a referenced value":String(value));
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
      const isStates=["states","States","State"].includes(heading);
      const name=heading==="filters"?"Collection filter":heading==="operands"?"Collection source":heading==="and"?"Required condition":heading==="or"?"Alternative condition":isStates?"Expected condition":heading==="concat"?"Expression part":prettyName(heading)+" entry";
      return o.map((v,i)=>{
        // A single simple authored State is just one condition, not a
        // collected Item. Show its predicate without a redundant array wrapper.
        if(isStates&&o.length===1&&v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===1){
          const [fieldName,condition]=Object.entries(v)[0];
          if(condition&&typeof condition==="object"&&!Array.isArray(condition)&&shortClause(condition,fieldName))
            return walk(condition,path.concat(i,fieldName),fieldName,depth+1);
        }
        return walk(v,path.concat(i),name+(o.length>1?" "+(i+1):""),depth+1);
      }).join("");
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
      return '<details class="structure-node" '+(depth<2?"open":"")+'><summary>'+esc(groupSummary)+'</summary><div class="structure-children">'+children+'</div></details>';
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
    if(!o||typeof o!=="object"){
      if(ref)return {text:"Referenced data source "+ref,detail:"Shared Object definition missing"};
      const objectless={
        "windows.auditeventpolicysubcategories":"Windows audit-policy settings",
        "windows.auditeventpolicy":"Windows audit-policy configuration",
        "windows.systemmetric":"Windows system settings",
        "independent.environmentvariable58":"environment variables"
      };
      return {text:objectless[capability]||"values collected by "+capability,
        detail:"Collected directly by the "+capability+" capability; no separate Object was authored"};
    }
    const humanCaps={
      "linux.partition":"mounted filesystem entries",
      "unix.file":"filesystem entries",
      "windows.registry":"Windows Registry entries",
      "windows.userright":"Windows user-right assignments",
      "windows.wmi.query":"Windows system information",
      "independent.shellcommand":"command output"
    };
    const source=humanCaps[capability]||capability+" results";
    if(capability==="windows.cmdlet"&&o.collect?.verb&&o.collect?.noun){
      const command=String(o.collect.verb)+"-"+String(o.collect.noun);
      const mod=o.collect.module_name?" ("+o.collect.module_name+")":"";
      return {text:"PowerShell "+command+mod,detail:"Exact cmdlet collection defined in collect; see details for parameters and selected properties"};
    }
    if(capability==="unix.sysctl"&&o.select?.name?.equals)
      return {text:"kernel setting "+String(o.select.name.equals),detail:"Read via unix.sysctl"};
    if(capability==="unix.interface"&&o.select?.name)
      return {text:o.select.name.matches_regex===".*"?"network interfaces":"selected network interfaces",detail:"Read via unix.interface"};
    if(capability==="independent.textfilecontent54"){
      const select=o.select||{};
      const path=select.full_path?.equals||
        (select.directory?.equals&&select.name?.equals?String(select.directory.equals).replace(/\/$/,"")+"/"+select.name.equals:null);
      const sample=select.pattern?.matches_regex;
      return {text:path?"file "+path+(sample?" using an authored text pattern":""):"selected text-file content",
        detail:"Text-file collection (textfilecontent54); "+(sample?"pattern in collection details":"see exact selector")};
    }

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
    if(!levels.includes(value))
      return '<p class="help">Special authored requirement: <code>'+esc(value)+'</code>. Use Source for this option; the editor cannot safely offer alternative quick choices.</p>';
    const enc=encodeURIComponent(JSON.stringify(path));
    const options=levels.map(k=>'<option value="'+esc(k)+'" '+(k===value?"selected":"")+'>'+esc(shortRequireChoice(k))+'</option>').join("");
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
      '<div class="predicate-heading">What must be true</div>'+
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
  // The most common native record case (e.g., Get-Tpm) can be edited as a
  // compact field matrix while the original State/record nesting stays intact.
  function alternativeValuesEditor(id,t){
    const states=t.states;
    if(!Array.isArray(states)||states.length<2||states.length>24||
      !["all","any"].includes(t.states_match))return "";
    const rows=[];
    let commonField=null,commonComparison=null;
    for(let i=0;i<states.length;i++){
      const state=states[i];
      if(!state||typeof state!=="object"||Array.isArray(state)||Object.keys(state).length!==1)return "";
      const [fieldName,predicate]=Object.entries(state)[0];
      if(!predicate||typeof predicate!=="object"||Array.isArray(predicate)||predicate.require)return "";
      const operators=["equals","case_insensitive_equals","matches_regex","greater_than","less_than","greater_than_or_equal","less_than_or_equal"];
      const used=operators.filter(key=>Object.hasOwn(predicate,key));
      if(used.length!==1||Object.keys(predicate).length!==1||typeof predicate[used[0]]==="object")return "";
      if(commonField===null){commonField=fieldName;commonComparison=used[0]}
      else if(fieldName!==commonField||used[0]!==commonComparison)return "";
      const v=predicate[used[0]];
      rows.push({value:v,path:["assessment","tests",id,"states",i,fieldName,used[0]]});
    }
    const title=t.states_match==="any"?"Accept any of these values":"All these conditions must match";
    const values=rows.map((r,i)=>'<label class="alternative-row"><span>'+(i+1)+'.</span>'+
      '<input data-field="'+encodeURIComponent(JSON.stringify(r.path))+'" value="'+esc(String(r.value))+'" aria-label="Alternative '+(i+1)+'" type="text"></label>').join("");
    return '<div class="inline-predicate alternatives-editor"><div class="predicate-heading">'+esc(title)+'</div>'+
      '<p class="help">Field: <code>'+esc(commonField)+'</code> · '+esc(prettyName(commonComparison))+'</p>'+
      '<div class="alternative-values">'+values+'</div></div>';
  }
  function recordFieldEditor(id,t){
    if(!Array.isArray(t.states)||t.states.length!==1)return "";
    const state=t.states[0];
    if(!state||typeof state!=="object"||Array.isArray(state)||Object.keys(state).length!==1)return "";
    const [entry,wrapper]=Object.entries(state)[0];
    const record=wrapper?.record,fields=record?.fields;
    if(!fields||typeof fields!=="object"||Array.isArray(fields))return "";
    const comparisons=["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"];
    const operations={equals:"Equals",case_insensitive_equals:"Equals (ignore case)",matches_regex:"Matches regex",greater_than_or_equal:"At least",less_than_or_equal:"At most",greater_than:"Greater than",less_than:"Less than"};
    const rendered=Object.entries(fields).map(([name,m])=>{
      if(!m||typeof m!=="object"||Array.isArray(m))return '<p class="warning">'+esc(name)+': complex field; see full details.</p>';
      const found=comparisons.filter(op=>Object.hasOwn(m,op));
      if(found.length!==1||typeof m[found[0]]==="object"||typeof m[found[0]]==="boolean")
        return '<p class="warning">'+esc(name)+': use full details for this comparison.</p>';
      const op=found[0],value=m[op],base=["assessment","tests",id,"states",0,entry,"record","fields",name];
      const allowed=typeof value==="number"?["equals","greater_than","greater_than_or_equal","less_than","less_than_or_equal"]:
        ["equals","case_insensitive_equals","matches_regex"];
      if(!allowed.includes(op))allowed.unshift(op);
      const opOptions=allowed.map(x=>'<option value="'+esc(x)+'" '+(x===op?"selected":"")+'>'+esc(operations[x]||x)+'</option>').join("");
      const opAttr=encodeURIComponent(JSON.stringify(base));
      const valAttr=encodeURIComponent(JSON.stringify(base.concat(op)));
      return '<div class="record-edit-row">'+
        '<div><label>Field</label><input type="text" data-rename-key="'+encodeURIComponent(JSON.stringify(base))+'" value="'+esc(name)+'" aria-label="Record field name '+esc(name)+'" spellcheck="false"></div>'+
        '<div><label>Must</label><select data-operation="'+opAttr+'" aria-label="Comparison for '+esc(name)+'">'+opOptions+'</select></div>'+
        '<div><label>Value</label><input type="text" data-field="'+valAttr+'" value="'+esc(String(value))+'" aria-label="Expected value for '+esc(name)+'"></div>'+
        (m.require?'<div class="record-require"><label>Values required</label>'+requirementSelect(base.concat("require"),m.require,"Field requirement")+'</div>':"")+
        '</div>';
    });
    return '<div class="inline-predicate record-editor"><div class="predicate-heading">Check these fields (record)</div>'+
      '<div class="record-fields">'+rendered.join("")+'</div>'+
      (record.require?'<p class="help">Record requirement: '+esc(requirementDescription(record.require))+'</p>':"")+
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
    const from=humanCollection(a,t),shape=simpleMatchShape(t),requireKey=Object.hasOwn(t,"require")?"require":"collected_items_require",counts=resultCountExplanation(t[requireKey]);
    const mode=t.states_match==="any"?"At least one alternative must match":t.states_match==="all"?"All alternatives must match":t.states_match==="none"?"No alternative may match":t.states_match==="one"?"Exactly one alternative must match":"State combination shown in details";
    return '<section class="combined-check" aria-label="Readable test description">'+
      '<h4>What this check means</h4>'+
      '<p class="check-sentence"><strong>Look at</strong> '+esc(from.text)+'. <small>'+esc(from.detail)+'</small></p>'+
      shellCommandDetails(a,id,t)+
      (shape?oneFieldEditor(id,t):recordFieldEditor(id,t)||alternativeValuesEditor(id,t)||
        '<div class="condition-readonly"><strong>Conditions (States)</strong><p>'+esc(summarizeTest(t))+'</p><p class="help">Open full details to edit nested conditions.</p></div>')+
      '<div class="quick-results"><label>How many results must be found and match? (collected_items_require)</label>'+
      requirementSelect(["assessment","tests",id,requireKey],t[requireKey],"Results that must be found and match")+
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
  function policyContext(){
    const r=active(),rule=docs.get("rule:"+r?.id)?.tree.rule;
    if(!rule)return "";
    const stigId=(rule.identifiers||[]).find(x=>x.scheme==="stig")?.value;
    const remediation=rule.remediation?.guidance;
    return '<section class="card policy-context"><div class="inspector-eyebrow">THE POLICY REQUIREMENT</div>'+
      '<h3>'+esc(rule.title||r.title)+'</h3>'+
      '<p class="policy-ids">'+esc([r.id,stigId,rule.severity?rule.severity+" severity":""].filter(Boolean).join(" · "))+'</p>'+
      '<details class="policy-details"><summary>Why this matters and how to fix it</summary>'+
      (rule.discussion?'<p>'+esc(rule.discussion)+'</p>':"")+
      (remediation?'<h4>Remediation</h4><p>'+esc(remediation)+'</p>':"")+
      '</details></section>';
  }
  function overview(){
    const a=doc().tree.assessment,refs={};countTestReferences(a.evaluate,refs);
    if(!selectedTest||!a.tests?.[selectedTest])selectedTest=Object.keys(refs).find(k=>a.tests?.[k])||Object.keys(a.tests||{})[0]||null;
    const unreferenced=Object.keys(a.tests||{}).filter(k=>!refs[k]);
    return policyContext()+'<section class="card"><h3>How compliance is checked</h3><p class="help">Assessment '+esc(a.id)+' · Draft '+esc(a.specification?.version||"unspecified")+' · No scanner results</p></section>'+
      '<div class="graph-layout"><section class="card logic-pane"><h3>1 · How the checks work together (evaluate)</h3><p class="help">Expand a branch. Select any Test to inspect it alongside the tree.</p>'+
      logic(a.evaluate,a,refs)+
      (unreferenced.length?'<details class="dependency-group"><summary>Unreferenced Test definitions ('+unreferenced.length+')</summary><div class="structure-children">'+unreferenced.map(id=>'<button class="logic-leaf" data-select-test="'+esc(id)+'">'+esc(a.tests[id].test_title||id)+'</button>').join("")+'</div></details>':"")+
      '</section>'+inspector(a,selectedTest,refs)+'</div>'+
      '<section class="card"><h3>Future sample evaluation — placement only</h3><p class="help">The future tested SCAP-NG interpreter will take supplied Items / field values and source statuses, then explain six-state outcomes for each Test and branch. Evaluation is not connected; no result is inferred here.</p><button class="button" disabled>Enter sample evidence (not connected)</button> <button class="button" disabled>Evaluate with scanner (not connected)</button></section>';
  }

  // The Guided authoring vocabulary is deliberately task-first. This bounded
  // authoring preset emits the current 0.4-A base schema, NOT experimental B.
  // It does not simulate a scanner or assert full-file banner equivalence.
  const BANNER_TEST="rhel-login-banner-required-line-test";
  const linePattern=value=>"^"+Array.from(value).map(c=>".*+?^$()[]{}|\\".includes(c)?"\\"+c:c).join("")+"$";
  function suggestedSourceName(capability,goal,filePath){
    const subject=String(goal||"the required setting").replace(/^the\s+/i,"").split(/\s+(?:must|should|shall|is required to)\b/i)[0].replace(/[.!?]+$/,"").trim()||"required setting";
    if(capability==="independent.textfilecontent54")return "Read "+subject+" in "+filePath;
    if(capability==="unix.symlink")return "Resolve symbolic link "+filePath;
    if(capability==="windows.registry")return "Read registry setting "+filePath;
    return "Collect "+subject+" with "+capability;
  }
  function buildBannerAssessment(id,title,filePath,requiredLine,capability,sourceTitle){
    if(capability!=="independent.textfilecontent54")throw Error("This Guided preset does not yet support that capability.");
    if(!sourceTitle.trim())throw Error("Name the data source in plain language.");
    if(!/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(id))throw Error("Use a meaningful lowercase Assessment ID (letters, digits, periods and hyphens).");
    if(docs.has("assessment:"+id))throw Error("Assessment ID already exists in My Assessments or the library.");
    if(!title.trim())throw Error("Enter a short description of the requirement.");
    if(!filePath.startsWith("/")||filePath.length<2||filePath.includes("\n"))throw Error("Specify an absolute Linux file path.");
    if(!requiredLine.trim()||/[\r\n]/.test(requiredLine))throw Error("Enter one nonempty line of required text (no line breaks).");
    return {assessment:{
      id,version:1,assessment_title:title.trim(),mode:"automated",class:"compliance",purpose:"assessment",
      specification:{id:"scap-ng.pre-alpha.assessment",version:"0.4.0"},
      tests:{[BANNER_TEST]:{
        test_title:"Login banner file contains the required line",
        capability:"independent.textfilecontent54",
        object:{
          capability,
          object_title:sourceTitle.trim(),
          select:{
            full_path:{equals:filePath},
            pattern:{matches_regex:linePattern(requiredLine)},
            instance:{greater_than_or_equal:1}
          },
          filesystem:"all",
          collect:{ignore_case:false,multiline:true,singleline:false,item_creation:"all_object_elements_fullfilled"}
        },
        states:[{text:{equals:requiredLine,require:"at_least_one_exists_and_all_match"}}],
        require:"at_least_one_exists_and_all_match",
        reported_elements:"all"
      }},
      evaluate:{test:BANNER_TEST}
    }};
  }

  const PROTECTION_STATES=[
    ["owner_uid","Owner UID",0],
    ["group_write","Group may write",false],
    ["other_write","Others may write",false]
  ];
  function buildProtectedBannerAssessment(base,secondLine){
    if(!secondLine||!secondLine.trim()||/[\r\n]/.test(secondLine))
      throw Error("Enter a second nonempty required line.");
    const a=base.assessment,firstKey=Object.keys(a.tests)[0],first=a.tests[firstKey];
    const secondKey="rhel-login-banner-second-required-line-test";
    const permissionsKey="rhel-login-banner-file-protection-test";
    if(secondLine===first.states[0].text.equals)
      throw Error("The second line must differ from the first; use the single-line check for one notice.");
    const other=structuredClone(first);
    other.test_title="Banner includes second required line";
    other.object.object_title="Read second required banner line from "+first.object.select.full_path.equals;
    other.object.select.pattern.matches_regex=linePattern(secondLine);
    other.states[0].text.equals=secondLine;
    const path=first.object.select.full_path.equals;
    a.tests[secondKey]=other;
    const fileStates=PROTECTION_STATES.map(([name,,value])=>({
      [name]:{equals:value,require:"at_least_one_exists_and_all_match"}
    }));
    a.tests[permissionsKey]={
      test_title:"Banner file is owned by root and not writable by group or others",
      capability:"unix.file",
      object:{capability:"unix.file",object_title:"Check ownership and write access to "+path,
        select:{full_path:{equals:path}},filesystem:"local"},
      states:fileStates,states_match:"all",
      require:"at_least_one_exists_and_all_match",reported_elements:"all"
    };
    a.evaluate={all:[{test:firstKey},{test:secondKey},{test:permissionsKey}]};
    return base;
  }
  function multiBannerParts(){
    const a=doc()?.tree.assessment;
    if(!a?.tests||!a.evaluate)return null;
    const tests=Object.entries(a.tests);
    const text=tests.filter(([,t])=>t?.capability==="independent.textfilecontent54");
    const file=tests.filter(([,t])=>t?.capability==="unix.file");
    if(text.length!==2||file.length!==1||tests.length!==3)return null;
    if(!text.every(([,t])=>t?.object?.select?.full_path?.equals&&
      typeof t?.states?.[0]?.text?.equals==="string")||
      !file[0][1]?.object?.select?.full_path?.equals||
      !Array.isArray(file[0][1].states))return null;
    return {a,tests,text,file:file[0]};
  }
  function renameTestAndReferences(tree,oldId,newId){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*-test$/.test(newId))
      throw Error("Test IDs must be lowercase hyphenated names ending in -test.");
    const a=tree.assessment;
    if(!Object.hasOwn(a.tests,oldId))throw Error("Original Test ID no longer exists.");
    if(oldId===newId)return false;
    if(Object.hasOwn(a.tests,newId))throw Error("That Test ID is already in use.");
    const referenced=[];
    const walkRefs=node=>{
      if(!node||typeof node!=="object")return;
      if(Array.isArray(node)){node.forEach(walkRefs);return}
      if(typeof node.test==="string"&&node.test===oldId)referenced.push(node);
      for(const [k,v] of Object.entries(node))if(k!=="test")walkRefs(v);
    };
    walkRefs(a.evaluate);
    if(!referenced.length)throw Error("Test reference is not in the expression tree.");
    a.tests=Object.fromEntries(Object.entries(a.tests).map(([name,val])=>[name===oldId?newId:name,val]));
    referenced.forEach(x=>{x.test=newId});
    return true;
  }
  function standaloneMultiWizard(){
    const p=multiBannerParts();
    if(!p)return '<section class="card"><h3>Custom source structure</h3><p>This Assessment no longer matches the three-check walkthrough. Use Source to inspect it without changing its original logic.</p></section>';
    const {a,text,file,tests}=p;
    const lineRows=text.map(([id,t],i)=>'<div class="property">'+
      '<label for="multi-line-'+i+'">Required banner line '+(i+1)+'</label>'+
      '<textarea id="multi-line-'+i+'" rows="3" data-multi-line="'+esc(id)+'" aria-label="Required banner line '+(i+1)+'">'+esc(t.states[0].text.equals)+'</textarea>'+
      '</div>').join("");
    const options=PROTECTION_STATES.map(([name,label])=>{
      const index=file[1].states.findIndex(x=>x?.[name]?.equals!==undefined);
      if(index<0)return '<p class="warning">Expected condition '+esc(name)+' is missing: review Source.</p>';
      const val=file[1].states[index][name].equals;
      const path=["assessment","tests",file[0],"states",index,name,"equals"];
      return field(path,label,val,typeof val==="boolean"?["true","false"]:null);
    }).join("");
    const join=Array.isArray(a.evaluate?.all)?"all":Array.isArray(a.evaluate?.any)?"any":null;
    const steps=["Goal and check names","Where to inspect","Expected conditions","Combine checks","Review"];
    const nav='<div class="steps">'+steps.map((name,i)=>
      '<button data-step="'+i+'" class="'+(step===i?"selected":"")+'">'+(i+1)+'. '+name+'</button>').join("")+'</div>';
    let content="";
    if(step===0)content='<section class="card"><h3>1 · Describe the security goal</h3>'+
      field(["assessment","assessment_title"],"What should be secured?",a.assessment_title)+
      field(["assessment","id"],"Assessment ID",a.id)+
      '<h4>Checks derived from your goal</h4><p class="help">Every check has its own Test ID. Rename any Test without breaking its references.</p>'+
      tests.map(([id,t],i)=>'<div class="property">'+
        '<label>Check '+(i+1)+': '+esc(t.test_title)+'</label>'+
        '<input type="text" data-rename-test="'+esc(id)+'" value="'+esc(id)+'" aria-label="Test ID for check '+(i+1)+'" spellcheck="false"></div>').join("")+'</section>';
    if(step===1){
      const filePath=text[0][1].object.select.full_path.equals;
      content='<section class="card"><h3>2 · Where should each check look?</h3>'+
        '<p><strong>One target file:</strong> all three checks inspect this same path, with independent collection results.</p>'+
        '<label for="multi-path">File to inspect</label><input id="multi-path" value="'+esc(filePath)+'" type="text" spellcheck="false">'+
        '<p class="help">Changing this field updates all three Object selectors together; source semantics are not silently merged.</p>'+
        tests.map(([id,t],i)=>'<div class="property"><strong>Check '+(i+1)+'</strong> · '+esc(t.capability)+
          '<p>'+esc(t.capability==="unix.file"?"Read file owner and permission fields":"Read the text in this file")+'</p></div>').join("")+
        '</section>';
    }
    if(step===2)content='<section class="card"><h3>3 · What must be true?</h3>'+
      '<h4>Two independent text searches</h4><p class="help">Each line has its own Test: finding one line does not prove the other line exists.</p>'+
      lineRows+
      '<h4>File owner and permissions</h4><p class="help">These three conditions apply to the SAME collected file Item, not three unrelated files.</p>'+
      options+
      field(["assessment","tests",file[0],"states_match"],"How should conditions on the same file combine?",file[1].states_match,["all","any"])+
      '<p class="help">All = owner is root AND neither group nor others may write. Any would weaken this requirement.</p></section>';
    if(step===3){
      content='<section class="card"><h3>4 · How do the separate checks combine?</h3>'+
        '<p>Each Test collects and evaluates its own evidence. No check assumes another one collected its result.</p>'+
        '<label for="multi-logic">All three Tests must pass, or just one?</label>'+
        '<select id="multi-logic" '+(join?"":"disabled")+'>'+
        '<option value="all" '+(join==="all"?"selected":"")+'>All checks must pass (AND)</option>'+
        '<option value="any" '+(join==="any"?"selected":"")+'>At least one check passes (OR)</option></select>'+
        '<p class="help">For this stated requirement choose AND: both notices and the file protection are required. OR is editable to demonstrate how the native logic changes.</p>'+
        '<h4>Review check structure</h4>'+tests.map(([id,t],i)=>'<p>'+(i+1)+'. '+esc(t.test_title)+' <code>'+esc(id)+'</code></p>').join("")+
        '</section>';
    }
    if(step===4){
      content='<section class="card"><h3>5 · Review all three checks</h3>'+
        '<p><strong>2 capabilities, 3 Tests, 5 expected State predicates</strong></p>'+
        '<p><strong>Tests:</strong> '+tests.map(([,t])=>esc(t.test_title)).join("; ")+'</p>'+
        '<p><strong>File conditions:</strong> '+esc(file[1].states_match==="all"?"All three must match the same file":"At least one must match the same file")+'</p>'+
        '<p><strong>Assessment logic:</strong> '+esc(join==="all"?"All three Tests must pass":"At least one Test may pass")+'</p>'+
        '<p class="warning">Pre-alpha source draft — scanner and complete schema/semantic validation are not connected.</p>'+
        '<details><summary>Inspect generated 0.4-A YAML</summary><pre>'+esc(doc().source)+'</pre></details></section>';
    }
    return nav+content+'<div class="actions">'+(step>0?'<button id="prev" class="button">Previous</button>':"")+
      (step<4?'<button id="next" class="button primary">Next →</button>':'<button id="gotoSource" class="button primary">Review YAML Source</button>')+
      '<button id="gotoGraph" class="button">Graphical overview</button></div>';
  }
  function bindMultiWizardEditors(){
    if(!standaloneId||!multiBannerParts())return;
    const mutate=(change,success)=>{
      const d=doc(),original=structuredClone(d.tree);
      try{
        change(d.tree);
        const raw=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});
        parse(raw);
        d.source=raw;d.changed=true;saveState();library();render();
        display(success+" — draft only; review YAML.");
      }catch(err){d.tree=original;display(err.message,true);render()}
    };
    const pathEditor=$("multi-path");
    if(pathEditor)pathEditor.onchange=()=>{
      const path=pathEditor.value.trim();
      if(!path.startsWith("/")||path.length<2||/[\r\n]/.test(path)){display("Enter an absolute file path.",true);render();return}
      mutate(tree=>{
        for(const t of Object.values(tree.assessment.tests)){
          if(t?.object?.select?.full_path?.equals!==undefined){
            t.object.select.full_path.equals=path;
            if(typeof t.object.object_title==="string")
              t.object.object_title=t.object.object_title.replace(/\/etc\/issue(?:\.net)?/g,path);
          }
        }
      },"Updated all three source file selectors");
    };
    $("content").querySelectorAll("[data-multi-line]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.multiLine,newLine=e.value;
      if(!newLine.trim()||/[\r\n]/.test(newLine)){display("Each required notice must be one nonempty line.",true);render();return}
      mutate(tree=>{
        const t=tree.assessment.tests[id];
        if(t?.capability!=="independent.textfilecontent54")throw Error("Text Test changed; use Source.");
        t.states[0].text.equals=newLine;
        t.object.select.pattern.matches_regex=linePattern(newLine);
      },"Updated line and escaped text search together");
    });
    $("content").querySelectorAll("[data-rename-test]").forEach(e=>e.onchange=()=>{
      const oldId=e.dataset.renameTest,newId=e.value.trim();
      mutate(tree=>renameTestAndReferences(tree,oldId,newId),"Renamed Test ID and all expression references");
    });
    const logicSelector=$("multi-logic");
    if(logicSelector)logicSelector.onchange=()=>{
      const op=logicSelector.value;
      if(!["all","any"].includes(op)){display("Unknown expression operator.",true);render();return}
      if(!confirm("Change Assessment logic to "+op.toUpperCase()+"? This can change when the entire Assessment passes.")){render();return}
      mutate(tree=>{
        const old=tree.assessment.evaluate;
        const leaves=old?.all||old?.any;
        if(!Array.isArray(leaves)||leaves.length!==3||!leaves.every(x=>typeof x?.test==="string"))
          throw Error("Complex logic tree changed; edit in Source.");
        tree.assessment.evaluate={[op]:leaves};
      },"Updated Assessment-level "+op.toUpperCase()+" expression");
    };
  }


  // Guided authoring field lists are loaded from immutable SCAP-NG mappings.
  const GUIDED_PLATFORM_CAPS=Object.freeze({linux:Object.freeze(["independent.textfilecontent54","unix.file","unix.symlink"]),windows:Object.freeze(["windows.registry"])});
  const guidedAllowedCapability=(platform,capability)=>Boolean(GUIDED_PLATFORM_CAPS[platform]?.includes(capability));
  const guidedPlatformLabel=platform=>guidedVocabulary?.platform_labels?.[platform]||platform;
  const guidedMaps=new Map();
  let guidedVocabulary=null;
  let guidedMapError="Capability mappings not loaded.";
  const guidedTerm=(key,fallback)=>guidedVocabulary?.term_scopes?.[key]?.label||fallback;
  const guidedPrompt=(key,fallback)=>guidedVocabulary?.term_scopes?.[key]?.prompt||fallback;
  const guidedCapabilityLabel=(capability,fallback)=>guidedVocabulary?.capabilities?.[capability]?.label||fallback;
  const guidedRegistryLabel=(part,key,fallback)=>guidedVocabulary?.capabilities?.["windows.registry"]?.[part]?.[key]?.label||fallback;
  function resolveGuidedNativePointer(capability,pointer,mappings){
    if(typeof pointer!=="string"||!/^native\.(?:selector_value_enums|state_value_enums|field_datatypes)\.[a-z][a-z0-9_]*$/.test(pointer))
      throw Error("Unsafe authoring vocabulary option source");
    const parts=pointer.split(".");
    const choices=parts.reduce((acc,part)=>acc?.[part],mappings.get(capability));
    if(!Array.isArray(choices)||choices.length===0||
       choices.some(v=>typeof v!=="string"||!v.trim())||
       new Set(choices).size!==choices.length)
      throw Error("Missing/invalid version-pinned option choices for "+capability+": "+pointer);
    return choices;
  }
  async function loadGuidedMappings(){
    const c=window.SCAPNG_GUIDED_MAPPINGS;
    if(!c?.repository||!/^[0-9a-f]{40}$/.test(c.revision)||
       c.specificationVersion!=="0.4.0"||!Array.isArray(c.capabilities))return;
    try{
      const loaded=await Promise.all(c.capabilities.map(async capability=>{
        if(!["independent.textfilecontent54","unix.file","unix.symlink","windows.registry"].includes(capability))throw Error("Unsupported capability "+capability);
        const url="https://raw.githubusercontent.com/"+c.repository+"/"+c.revision+
          "/schema/v0.4.0/capability-mappings/supported/"+capability+".json";
        const res=await fetch(url,{cache:"force-cache"});
        if(!res.ok)throw Error("Mapping HTTP "+res.status);
        const m=await res.json();
        if(m.capability!==capability||m.specification_version!==c.specificationVersion||
           !m.native?.state_field_map||!m.native?.field_datatypes||
           !Array.isArray(m.native?.object_selector_alternatives))
          throw Error("Mismatched or incomplete mapping");
        return [capability,m];
      }));
      const byCapability=new Map(loaded);
      if(typeof c.vocabularyPath!=="string"||c.vocabularyPath!=="schema/v0.4.0/authoring-vocabulary.en.json")
        throw Error("Missing pinned authoring vocabulary path");
      const vocabResponse=await fetch("https://raw.githubusercontent.com/"+c.repository+"/"+c.revision+"/"+c.vocabularyPath,{cache:"force-cache"});
      if(!vocabResponse.ok)throw Error("Vocabulary HTTP "+vocabResponse.status);
      const vocabulary=await vocabResponse.json();
      if(vocabulary.format!=="scap-ng-authoring-vocabulary/0.1"||
         vocabulary.schema_version!==c.specificationVersion||
         vocabulary.language!=="en"||vocabulary.normative!==false||
         !vocabulary.term_scopes?.["test.require"]?.label||
         !vocabulary.term_scopes?.["state.field.require"]?.label||
         !vocabulary.term_scopes?.["authoring.target_platform"]?.prompt||
         !["linux","windows"].every(p=>typeof vocabulary.platform_labels?.[p]==="string"))
        throw Error("Vocabulary incompatible with pinned 0.4-A schema");
      for(const capability of c.capabilities){
        if(!vocabulary.capabilities?.[capability]?.label)
          throw Error("Vocabulary has no description of "+capability);
      }
      const reg=vocabulary.capabilities["windows.registry"];
      for(const [part,fields,kind] of [
        ["selectors",reg.selectors,"allowed_values_source"],
        ["state_fields",reg.state_fields,"allowed_values_source"],
        ["state_fields",reg.state_fields,"datatype_choices_source"]]){
        for(const entry of Object.values(fields||{})){
          if(Object.hasOwn(entry,kind))
            resolveGuidedNativePointer("windows.registry",entry[kind],byCapability);
        }
      }
      guidedMaps.clear();loaded.forEach(([key,value])=>guidedMaps.set(key,value));
      guidedVocabulary=vocabulary;guidedMapError="";
    }catch(err){guidedMaps.clear();guidedVocabulary=null;guidedMapError="Pinned mapping/vocabulary unavailable: "+err.message}
    if(creatingStandalone||doc()?.guidedGeneric)render();
  }
  const assessmentIdValid=id=>/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(id);
  function suggestId(value,suffix=""){
    const slug=String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,78).replace(/-+$/,"");
    return (slug||"new-check")+suffix;
  }
  function renderBlankCreation(){
    $("crumb").textContent="MY ASSESSMENTS / NEW";
    $("title").textContent="New Assessment — start from your goal";
    $("state").textContent="Incomplete draft · no scanner";
    $("notice").textContent="Start blank. Nothing is linked to a STIG or prefilled from a RHEL example.";
    $("content").innerHTML='<section class="card"><h3>1 · Choose target platform</h3>'+
      '<p>Select the operating system first to narrow the available evidence collectors and Tests. Then describe the security goal.</p>'+
      '<form id="blank-create" class="standalone-create">'+
      '<label for="blank-platform">'+esc(guidedPrompt("authoring.target_platform","Which operating system will this Assessment check?"))+'</label>'+
      '<select id="blank-platform" name="platform" required>'+
      '<option value="" selected disabled>Choose target platform…</option>'+
      '<option value="linux">'+esc(guidedPlatformLabel("linux"))+'</option>'+
      '<option value="windows">'+esc(guidedPlatformLabel("windows"))+'</option>'+
      '<option value="macos" disabled>'+esc(guidedPlatformLabel("macos"))+' — Guided checks not ready</option>'+
      '<option value="solaris" disabled>'+esc(guidedPlatformLabel("solaris"))+' — Guided checks not ready</option></select>'+
      '<p class="help">Only capability forms already supported for the selected platform will appear. This does not add or infer SCAP-NG applicability.</p>'+
      '<h3>2 · Describe the security goal</h3>'+
      '<label for="blank-goal">'+esc(guidedPrompt("assessment.assessment_title","Security requirement"))+'</label>'+
      '<textarea name="goal" id="blank-goal" required rows="3" placeholder="Example: Audit logs must be owned by root and not writable by other users"></textarea>'+
      '<label for="blank-id">Suggested Assessment ID (editable)</label>'+
      '<input id="blank-id" name="id" required spellcheck="false" placeholder="custom.audit-log-protection">'+
      '<p class="help">This local draft begins with no Tests and is incomplete until you add at least one.</p>'+
      '<button class="button primary" type="submit">Create blank Assessment →</button>'+
      '<p id="blank-error" class="warning" role="alert"></p></form>'+
      '<hr><p class="help">Prefer the original walkthrough?</p>'+
      '<button type="button" class="button" id="try-example">Open RHEL banner example</button></section>';
    const goal=$("blank-goal"),id=$("blank-id");
    let manual=false;
    id.oninput=()=>{manual=true};
    goal.oninput=()=>{if(!manual)id.value="custom."+suggestId(goal.value)};
    $("try-example").onclick=()=>{newCreateMode="example";render()};
    $("blank-create").onsubmit=e=>{
      e.preventDefault();
      try{
        const title=goal.value.trim(),identity=id.value.trim(),platform=$("blank-platform").value;
        if(!Object.hasOwn(GUIDED_PLATFORM_CAPS,platform))throw Error("Choose a target platform with supported Guided check forms.");
        if(!title)throw Error("Enter a security requirement.");
        if(!assessmentIdValid(identity))throw Error("Use a lowercase Assessment ID (letters, digits, periods or hyphens).");
        if(docs.has("assessment:"+identity))throw Error("Assessment ID already exists.");
        const tree={assessment:{
          id:identity,version:1,assessment_title:title,mode:"automated",
          class:"compliance",purpose:"assessment",
          specification:{id:"scap-ng.pre-alpha.assessment",version:"0.4.0"},tests:{}
        }};
        const raw=jsyaml.dump(tree,{lineWidth:105,noRefs:true}),p=parse(raw);
        const key=addDoc(p.id+".assessment.yaml",raw,"Locally created draft");
        docs.get(key).guidedGeneric=true;docs.get(key).guidedPlatform=platform;docs.get(key).changed=true;
        standaloneId=p.id;chosen=null;creatingStandalone=false;step=0;view="guided";
        saveState();library();render();
        display("Blank Assessment created. Add a first Test before exporting.");
      }catch(err){$("blank-error").textContent=err.message;display(err.message,true)}
    };
  }
  const genericSupportedField=(capability,field)=>{
    // Registry "value" is multi-datatype (string/integer/binary/version).
    // Choosing one implicitly would change authored semantics.
    if(capability==="windows.registry"&&field==="value")return null;
    const map=guidedMaps.get(capability);
    if(!map||!Object.values(map.native.state_field_map).includes(field))return null;
    const types=map.native.field_datatypes[field]||[];
    // This form explicitly creates a literal *string* textfilecontent54 match,
    // not a Boolean/integer typed instance of this multi-datatype field.
    if(capability==="independent.textfilecontent54"&&field==="text"&&types.includes("string"))
      return "string";
    // All other multi-datatype fields need an explicit datatype chooser first.
    if(types.length!==1)return null;
    return types[0]==="boolean"||types[0]==="integer"||types[0]==="string"?types[0]:null;
  };
  const guidedStateFields=capability=>{
    const map=guidedMaps.get(capability);
    if(!map)return [];
    // The registry 'value' field supports several incompatible datatypes.
    // Do not silently coerce its source value to a string.
    return [...new Set(Object.values(map.native.state_field_map))].filter(name=>
      !(capability==="windows.registry"&&name==="value")&&genericSupportedField(capability,name));
  };
  function genericFieldOptions(selected,capability="unix.file"){
    return guidedStateFields(capability).map(name=>{
      const label=capability==="windows.registry"?
        guidedRegistryLabel("state_fields",name,name.replaceAll("_"," ")):name.replaceAll("_"," ");
      return '<option value="'+esc(name)+'" '+(selected===name?"selected":"")+'>'+esc(label)+'</option>';
    }).join("");
  }
  function guidedValueEnums(capability,field){
    const m=guidedMaps.get(capability);
    return m?.native?.state_value_enums?.[field]||null;
  }
  function genericValue(type,value,capability="unix.file",field="",inputId="generic-value"){
    const enums=guidedValueEnums(capability,field);
    if(Array.isArray(enums)&&enums.length)return '<select '+(inputId?'id="'+esc(inputId)+'"':"")+'>'+
      enums.map(x=>'<option value="'+esc(x)+'" '+(String(value)===x?"selected":"")+'>'+esc(x.replaceAll("_"," "))+'</option>').join("")+'</select>';
    if(type==="boolean")return '<select '+(inputId?'id="'+esc(inputId)+'"':"")+'>'+
      ["false","true"].map(x=>'<option value="'+x+'" '+(String(value)===x?"selected":"")+'>'+x+'</option>').join("")+'</select>';
    return '<input '+(inputId?'id="'+esc(inputId)+'"':"")+' type="'+(type==="integer"?"number":"text")+'" value="'+esc(value??(type==="integer"?0:""))+'" '+(type==="integer"?'step="1"':"")+' required>';
  }
  function genericTypedValue(field,raw,capability="unix.file"){
    const type=genericSupportedField(capability,field);
    if(!type)throw Error("Field "+field+" is unsupported by the pinned "+capability+" mapping.");
    if(type==="boolean"){
      if(!["true","false"].includes(String(raw)))throw Error("Expected true or false.");
      return String(raw)==="true";
    }
    if(type==="integer"){
      if(!/^-?\d+$/.test(String(raw))||!Number.isSafeInteger(Number(raw)))
        throw Error("Enter a safe whole number.");
      return Number(raw);
    }
    if(!String(raw).trim())throw Error("Enter an expected value.");
    const enums=guidedValueEnums(capability,field);
    if(enums&&!enums.includes(String(raw)))throw Error("Choose a defined value for "+field+".");
    return String(raw);
  }
  function guidedLocator(t){
    return t.capability==="windows.registry"?t.object?.select?.key?.equals:
      t.object?.select?.full_path?.equals;
  }

  // A deliberately bounded native evaluate editor. Only AND/OR groups and
  // Test leaves are editable here; conditional/NOT/Assessment references stay
  // visible in Source instead of being rewritten to a simpler meaning.
  function guidedExpressionLeaves(node,depth=0){
    if(!node)return [];
    if(!node||typeof node!=="object"||Array.isArray(node)||depth>16)
      throw Error("Unsupported or excessively nested expression.");
    const keys=Object.keys(node);
    if(keys.length!==1)throw Error("Unexpected expression keys.");
    if(keys[0]==="test"){
      if(typeof node.test!=="string")throw Error("Invalid Test reference.");
      return [node.test];
    }
    const op=keys[0],children=node[op];
    if(!["all","any"].includes(op)||!Array.isArray(children)||children.length<2)
      throw Error("Only AND/OR groups with two or more branches can be edited in Guided mode.");
    return children.flatMap(child=>guidedExpressionLeaves(child,depth+1));
  }
  function guidedGroupAt(root,path){
    let at=root;
    for(const index of path){
      const kids=at?.all||at?.any;
      if(!Array.isArray(kids)||!Number.isInteger(index)||index<0||index>=kids.length)
        throw Error("Group location changed; reopen Guided.");
      at=kids[index];
    }
    if(!Array.isArray(at?.all)&&!Array.isArray(at?.any))
      throw Error("Selected expression is not an AND/OR group.");
    return at;
  }
  function guidedRemoveLeaf(node,id){
    if(node?.test)return node.test===id?null:node;
    const op=node?.all?"all":node?.any?"any":null;
    if(!op)throw Error("Unsupported expression while unlinking.");
    const children=node[op].map(x=>guidedRemoveLeaf(x,id)).filter(Boolean);
    return children.length===0?null:children.length===1?children[0]:{[op]:children};
  }
  function genericLogicOutline(a,node,path=[],depth=0){
    if(depth>16)return '<p class="warning">Expression nesting limit reached.</p>';
    if(node?.test)return '<div class="logic-leaf">'+
      '<strong>'+esc(a.tests[node.test]?.test_title||node.test)+'</strong>'+
      '<small>'+esc(node.test)+'</small></div>';
    const op=node?.all?"all":node?.any?"any":null;
    if(!op)return '<p class="warning">Unsupported expression; edit in Source.</p>';
    const kids=node[op],encoded=encodeURIComponent(JSON.stringify(path));
    const positions=kids.flatMap((n,i)=>kids.length>=3&&i<kids.length-1&&n?.test&&kids[i+1]?.test?
      [{i,label:(a.tests[n.test]?.test_title||n.test)+" + "+(a.tests[kids[i+1].test]?.test_title||kids[i+1].test)}]:[]);
    return '<div class="logic-group generic-logic-node"><div class="generic-logic-heading">'+
      '<strong>'+(op==="all"?"AND — every branch required":"OR — any branch may succeed")+'</strong>'+
      (depth>0?'<label>Join these branches: <select data-generic-group-op="'+encoded+'">'+
        '<option value="all" '+(op==="all"?"selected":"")+'>AND</option>'+
        '<option value="any" '+(op==="any"?"selected":"")+'>OR</option></select></label>':"")+
      '</div><div class="logic-children">'+
      kids.map((c,i)=>genericLogicOutline(a,c,path.concat(i),depth+1)).join("")+
      (positions.length?'<div class="generic-logic-pair"><label>Group adjacent independent checks</label>'+
        '<select data-generic-pair="'+encoded+'">'+
        positions.map(p=>'<option value="'+p.i+'">'+esc(p.label)+'</option>').join("")+'</select>'+
        '<button type="button" class="button" data-generic-nest="'+encoded+'">Create nested OR group</button>'+
        '</div>':"")+
      '</div></div>';
  }

  function genericNewTest(a,{title,id,capability,path,line,field,value,hive,registryName}){
    if(!title.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*-test$/.test(id))
      throw Error("Enter a check description and lowercase Test ID ending -test.");
    if(a.tests[id])throw Error("That Test ID is already used.");
    if(!guidedAllowedCapability(doc()?.guidedPlatform,capability))throw Error("That capability is not supported for the selected target platform.");
    if(!guidedMaps.has(capability))throw Error("Capability mapping unavailable.");
    if(capability!=="windows.registry"&&(!path.startsWith("/")||path.length<2||/[\r\n]/.test(path)))
      throw Error("Select a complete absolute Linux file path.");
    let t;
    if(capability==="independent.textfilecontent54"){
      if(!line?.trim()||/[\r\n]/.test(line))throw Error("Enter a single nonempty required line.");
      t={test_title:title.trim(),capability,object:{
          capability,object_title:"Find required line in "+path,
          select:{full_path:{equals:path},pattern:{matches_regex:linePattern(line)},instance:{greater_than_or_equal:1}},
          filesystem:"all",
          collect:{ignore_case:false,multiline:true,singleline:false,item_creation:"all_object_elements_fullfilled"}
        },
        states:[{text:{equals:line,require:"at_least_one_exists_and_all_match"}}],
        require:"at_least_one_exists_and_all_match",reported_elements:"all"};
    }else if(capability==="unix.file"||capability==="unix.symlink"){
      t={test_title:title.trim(),capability,object:{
          capability,object_title:(capability==="unix.file"?"Inspect file properties for ":"Resolve symbolic link ")+path,
          select:{full_path:{equals:path}},
          ...(capability==="unix.file"?{filesystem:"local"}:{})},
        states:[{[field]:{equals:genericTypedValue(field,value,capability),require:"at_least_one_exists_and_all_match"}}],
        require:"at_least_one_exists_and_all_match",reported_elements:"all"};
    }else if(capability==="windows.registry"){
      const map=guidedMaps.get(capability);
      if(!map.native.selector_value_enums?.hive?.includes(hive))
        throw Error("Select a supported registry hive from the pinned mapping.");
      if(!path||/[\r\n]/.test(path)||!registryName||/[\r\n]/.test(registryName))
        throw Error("Enter a registry key and named value; default-value/null selectors are not yet available.");
      t={test_title:title.trim(),capability,
        object:{capability,object_title:"Read registry value "+hive+"\\"+path+"\\"+registryName,
          select:{hive:{equals:hive},key:{equals:path},name:{equals:registryName}}},
        states:[{[field]:{equals:genericTypedValue(field,value,capability),require:"at_least_one_exists_and_all_match"}}],
        require:"at_least_one_exists_and_all_match",reported_elements:"all"};
    }else throw Error("Capability not implemented.");
    const old=a.evaluate;
    if(old)guidedExpressionLeaves(old);
    if(old?.test&&!a.tests[old.test])throw Error("Existing Test reference is unresolved.");
    a.tests[id]=t;
    if(!old)a.evaluate={test:id};
    else if(old.test)a.evaluate={all:[old,{test:id}]};
    else {const op=old.all?"all":"any";a.evaluate={[op]:[...(old[op]),{test:id}]}}
  }
  function genericTreeReady(a){
    const entries=Object.entries(a.tests||{});
    const platform=doc()?.guidedPlatform;
    if(platform&&entries.some(([,t])=>!guidedAllowedCapability(platform,t.capability)))return false;
    if(!entries.every(([,t])=>{
      const map=guidedMaps.get(t.capability),select=t.object?.select;
      if(!map||!select||t.object.capability!==t.capability||!Array.isArray(t.states)||
         !t.states.length||!levels.includes(t.require))return false;
      if(t.capability==="windows.registry"){
        if(Object.keys(select).sort().join(",")!=="hive,key,name"||
           !map.native.selector_value_enums?.hive?.includes(select.hive?.equals)||
           ![select.key?.equals,select.name?.equals].every(v=>typeof v==="string"&&v.length>0))return false;
      }else{
        const wanted=t.capability==="independent.textfilecontent54"?
          "full_path,instance,pattern":"full_path";
        if(Object.keys(select).sort().join(",")!==wanted||
           typeof select.full_path?.equals!=="string"||
           !select.full_path.equals.startsWith("/"))return false;
        if(t.capability==="independent.textfilecontent54"&&
           (typeof select.pattern?.matches_regex!=="string"||
            select.instance?.greater_than_or_equal!==1||
            t.states.length!==1||typeof t.states[0]?.text?.equals!=="string"))return false;
      }
      if(t.states.length>1&&!["all","any","one","odd"].includes(t.states_match))return false;
      return t.states.every(state=>{
        if(!state||typeof state!=="object"||Object.keys(state).length!==1)return false;
        const name=Object.keys(state)[0],predicate=state[name],type=genericSupportedField(t.capability,name);
        if(!type||!predicate||!levels.includes(predicate.require)||
           !Object.hasOwn(predicate,"equals")||Object.keys(predicate).some(k=>!["equals","require"].includes(k)))return false;
        const v=predicate.equals;
        if(type==="integer"&&(!Number.isSafeInteger(v)))return false;
        if(type==="boolean"&&typeof v!=="boolean")return false;
        if(type==="string"&&typeof v!=="string")return false;
        const vals=guidedValueEnums(t.capability,name);
        return !vals||vals.includes(v);
      });
    }))return false;
    try{
      const leaves=guidedExpressionLeaves(a.evaluate);
      return leaves.length===entries.length&&leaves.every(id=>!!a.tests[id])&&
        new Set(leaves).size===leaves.length;
    }catch{return false}
  }
  function genericChange(modify,success){
    const d=doc(),before=structuredClone(d.tree);
    try{
      modify(d.tree.assessment);
      if(!genericTreeReady(d.tree.assessment))throw Error("Test references inconsistent; no changes saved.");
      const source=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});parse(source);
      d.source=source;d.changed=true;saveState();render();
      display(success+" — draft only, without schema or scanner validation.");
    }catch(err){d.tree=before;render();display(err.message,true)}
  }


  function genericWizard(){
    const a=doc().tree.assessment,entries=Object.entries(a.tests||{});
    if(!genericTreeReady(a))return '<section class="card"><h3>Source structure needs review</h3>'+
      '<p>This Assessment contains a more advanced or inconsistent expression than the bounded Guided authoring builder can safely edit. Source is preserved.</p>'+
      '<button id="gotoSource" class="button">Inspect YAML</button></section>';
    const platform=doc()?.guidedPlatform;
    const caps=(GUIDED_PLATFORM_CAPS[platform]||[]).map(capability=>[capability,guidedCapabilityLabel(capability,capability)]);
    const capabilities=caps.filter(([key])=>guidedMaps.has(key));
    const capList=capabilities.map(([key,name])=>'<option value="'+esc(key)+'">'+esc(name)+' — '+esc(key)+'</option>').join("");
    const op=a.evaluate?.any?"any":"all";
    const testRows=entries.map(([id,t],i)=>{
      const path=guidedLocator(t),isText=t.capability==="independent.textfilecontent54",
        isRegistry=t.capability==="windows.registry";
      const details=isText?'<label>Complete required line (textfilecontent54)</label>'+
        '<textarea rows="2" data-generic-line="'+esc(id)+'">'+esc(t.states[0]?.text?.equals??"")+'</textarea>'+
        '<p class="help">One independent Test checks one required line. Add a separate Test for another required line.</p>':
        '<h4>'+esc(guidedTerm("test.states","What must be true"))+' of the same collected '+(isRegistry?"registry entry":isText?"line":"file or link")+'?</h4>'+
        t.states.map((entry,index)=>{
          const name=Object.keys(entry)[0],p=entry[name],type=genericSupportedField(t.capability,name);
          const choices=guidedValueEnums(t.capability,name)||(type==="boolean"?["true","false"]:null);
          const editor=choices?
            '<select aria-label="Expected '+esc(name)+'" data-generic-state="'+esc(id)+'" data-index="'+index+'">'+
            choices.map(v=>'<option value="'+esc(v)+'" '+(String(p.equals)===v?"selected":"")+'>'+esc(String(v).replaceAll("_"," "))+'</option>').join("")+'</select>':
            '<input aria-label="Expected '+esc(name)+'" type="'+(type==="integer"?"number":"text")+'" data-generic-state="'+esc(id)+'" data-index="'+index+'" value="'+esc(p.equals)+'" '+(type==="integer"?'step="1"':"")+'>';
          const fieldLabel=isRegistry?guidedRegistryLabel("state_fields",name,name.replaceAll("_"," ")):name.replaceAll("_"," ");
          return '<div class="generic-state-row"><strong>'+esc(fieldLabel)+'</strong>'+
            '<div>'+editor+'</div>'+
            '<button class="button" data-generic-remove-state="'+esc(id)+'" data-index="'+index+'" '+(t.states.length<=1?"disabled":"")+' title="Remove this expected field">Remove</button></div>';
        }).join("")+
        (t.states.length>1?field(["assessment","tests",id,"states_match"],
            guidedPrompt("test.states_match","How conditions on this collected Item combine"),t.states_match,["all","any","one","odd"]):"")+
        '<form class="generic-add-state" data-generic-add-state="'+esc(id)+'">'+
        '<label>Add another condition to this SAME collected '+(isRegistry?"registry entry":"Item")+'</label>'+
        '<div class="generic-cond-add"><select data-generic-field-for="'+esc(id)+'" aria-label="Expected field to add">'+
        genericFieldOptions(undefined,t.capability)+'</select><span data-generic-value-host="'+esc(id)+'"></span>'+
        '<button type="submit" class="button">+ Add condition</button></div></form>';
      return '<section class="card generic-check"><div class="generic-check-top">'+
        '<h3>Check '+(i+1)+' · '+esc(t.test_title)+'</h3>'+
        '<button type="button" class="button" data-generic-remove-test="'+esc(id)+'">Remove check</button></div>'+
        '<p class="help">Capability: '+esc(t.capability)+'</p>'+
        '<div class="generic-check-fields">'+
        '<div><label>Check description</label><input data-field="'+encodeURIComponent(JSON.stringify(["assessment","tests",id,"test_title"]))+'" value="'+esc(t.test_title)+'"></div>'+
        '<div><label>Test ID (editable)</label><input data-generic-rename="'+esc(id)+'" value="'+esc(id)+'" spellcheck="false"></div>'+
        '<div><label>'+(isRegistry?"Windows Registry key":"Absolute Linux file path")+'</label><input data-generic-path="'+esc(id)+'" value="'+esc(path)+'" spellcheck="false"></div>'+
        '<div><label>Data source description</label><input data-field="'+encodeURIComponent(JSON.stringify(["assessment","tests",id,"object","object_title"]))+'" value="'+esc(t.object.object_title||"")+'"></div></div>'+
        (isRegistry?'<div class="generic-check-fields"><div><label>Registry hive</label><select data-generic-hive="'+esc(id)+'">'+
          (guidedMaps.get(t.capability)?.native?.selector_value_enums?.hive||[]).map(h=>'<option value="'+esc(h)+'" '+(t.object.select.hive?.equals===h?"selected":"")+'>'+esc(h.replaceAll("_"," "))+'</option>').join("")+
          '</select></div><div><label>Named registry value</label><input data-generic-reg-name="'+esc(id)+'" value="'+esc(t.object.select.name?.equals||"")+'"></div></div>':"")+
        details+
        '<details><summary>More collection and matching details (advanced)</summary>'+
        '<p>Collected Items requirement: '+esc(t.require)+'</p>'+
        (isText?'<p>Text collection is pinned to exact complete-line search with explicit options and escaped punctuation.</p>':"")+
        '<p class="help">Detailed edits remain available through Source; no hidden semantic changes are applied.</p></details></section>';
    }).join("");
    const addDisabled=capabilities.length===0||capabilities.length!==(GUIDED_PLATFORM_CAPS[platform]?.length||0);
    // Local editor metadata is NOT authored SCAP-NG YAML. Old exports and
    // browser drafts may have lost this field. Let authors explicitly restore
    // a compatible choice without modifying any existing source semantics.
    const platformsMatchingChecks=Object.keys(GUIDED_PLATFORM_CAPS).filter(p=>
      entries.every(([,t])=>guidedAllowedCapability(p,t.capability)));
    const mayChoosePlatform=!entries.length||(!platform&&platformsMatchingChecks.length>0);
    return '<section class="card"><h3>Guided Assessment — started from your goal</h3>'+
      '<label for="generic-platform">'+esc(guidedTerm("authoring.target_platform","Target platform"))+'</label>'+
      '<select id="generic-platform" '+(mayChoosePlatform?"":"disabled")+'>'+
      '<option value="" '+(!platform?"selected":"")+' disabled>Choose platform</option>'+
      (entries.length?platformsMatchingChecks:["linux","windows"]).map(p=>
        '<option value="'+p+'" '+(platform===p?"selected":"")+'>'+esc(guidedPlatformLabel(p))+'</option>').join("")+'</select>'+
      '<p class="help">'+(entries.length?
        (platform?"Platform is locked while checks exist. Remove all Tests or create a separate Assessment to switch platforms.":
         "This older draft has no platform metadata. Choose a platform compatible with every existing Test to restore Guided editing. Your YAML will not change.") :
        "Change the platform before adding your first check.")+'</p>'+
      field(["assessment","assessment_title"],guidedTerm("assessment.assessment_title","Security requirement"),a.assessment_title)+
      field(["assessment","id"],"Assessment ID",a.id)+
      '<p class="help">Not tied to any STIG. The editor will not invent collection results or a scanner verdict.</p>'+
      '<p><strong>'+entries.length+' independent check'+(entries.length===1?"":"s")+'</strong> · '+
      new Set(entries.map(([,t])=>t.capability)).size+' capabilities</p>'+
      (entries.length===0?'<p class="warning">Incomplete draft: no Tests yet. Add your first check below.</p>':"")+
      '</section>'+
      (entries.length>1?'<section class="card"><h3>'+esc(guidedPrompt("assessment.evaluate","How do the independent checks combine?"))+'</h3>'+
        '<select id="generic-logic" aria-label="Combine independent Tests">'+
        '<option value="all" '+(op==="all"?"selected":"")+'>ALL checks must succeed (AND)</option>'+
        '<option value="any" '+(op==="any"?"selected":"")+'>ANY check may succeed (OR)</option></select>'+
        '<p class="help">This changes the Assessment expression, not which expected fields belong to each Test.</p>'+
        '<h4>Assessment logic tree</h4>'+genericLogicOutline(a,a.evaluate)+'</section>':"")+
      testRows+
      '<section class="card"><h3>+ Add an independent check</h3>'+
      (addDisabled?'<p class="warning">'+esc(platform?guidedMapError:"Target platform is not recorded for this older draft. Remove existing Tests or create a new platform-scoped Assessment.")+'</p>':'<p class="help">Showing '+esc(guidedPlatformLabel(platform))+' check types only. Select a source capability, then describe the expected field or required text.</p>')+
      '<form id="generic-add-test" class="standalone-create">'+
      '<label for="generic-check-title">What does this check verify?</label>'+
      '<input id="generic-check-title" required placeholder="Example: The audit log must be owned by root">'+
      '<label for="generic-check-id">Suggested Test ID (editable)</label>'+
      '<input id="generic-check-id" required spellcheck="false" placeholder="audit-log-owned-by-root-test">'+
      '<label for="generic-capability">'+esc(guidedPrompt("test.capability","How should the data be collected?"))+'</label>'+
      '<select id="generic-capability" '+(addDisabled?"disabled":"")+'>'+capList+'</select>'+
      '<label for="generic-path" id="generic-path-label">Absolute Linux file to inspect</label>'+
      '<input id="generic-path" required spellcheck="false" placeholder="/var/log/secure">'+
      '<div id="generic-registry-group" hidden class="generic-dynamic">'+
      '<label for="generic-hive">'+esc(guidedRegistryLabel("selectors","hive","Windows Registry hive"))+'</label><select id="generic-hive">'+
      (guidedMaps.get("windows.registry")?.native?.selector_value_enums?.hive||[]).map(h=>
        '<option value="'+esc(h)+'">'+esc(h.replaceAll("_"," "))+'</option>').join("")+
      '</select>'+
      '<label for="generic-registry-name">'+esc(guidedRegistryLabel("selectors","name","Registry value name"))+' (not the default/unnamed value)</label>'+
      '<input id="generic-registry-name" spellcheck="false" placeholder="ExampleValue"></div>'+
      '<div id="generic-line-group" class="generic-dynamic"><label for="generic-line">Exact complete line required in the file</label>'+
      '<textarea id="generic-line" rows="2" placeholder="Required notice text"></textarea></div>'+
      '<div id="generic-field-group" class="generic-dynamic" hidden>'+
      '<label for="generic-field" id="generic-field-label">Which collected property must match?</label>'+
      '<select id="generic-field">'+genericFieldOptions()+'</select>'+
      '<label for="generic-value">Required field value</label><div id="generic-new-value-host"></div>'+
      '<p id="generic-registry-type-help" class="help" hidden></p></div>'+
      '<button type="submit" class="button primary" '+(addDisabled?"disabled":"")+'>+ Add check</button>'+
      '<p id="generic-error" role="alert" class="warning"></p></form></section>'+
      (entries.length?'<section class="card"><h3>Review the composed Assessment</h3>'+
        '<p>Checks: '+entries.map(([,t])=>esc(t.test_title)).join("; ")+'</p>'+
        '<p>Assessment requires: '+(entries.length===1?"the single check":op==="any"?"any one of the checks":"every check")+'</p>'+
        '<button id="gotoSource" class="button primary">Review complete YAML</button>'+
        '<p class="warning">Authoring draft only. No complete schema/capability semantic validation or scanner execution.</p></section>':"");
  }
  function bindGenericEditors(){
    const d=doc();
    if(!standaloneId||!d?.guidedGeneric||view!=="guided")return;
    const cap=$("generic-capability"),newField=$("generic-field");
    const platformInput=$("generic-platform");
    if(platformInput)platformInput.onchange=()=>{
      const selected=platformInput.value;
      if(!Object.hasOwn(GUIDED_PLATFORM_CAPS,selected)){display("Unsupported target platform",true);render();return;}
      const tests=Object.values(d.tree.assessment.tests||{});
      if(tests.length&&(d.guidedPlatform||!tests.every(t=>guidedAllowedCapability(selected,t.capability)))){
        display("Platform change refused: existing Tests are locked or incompatible.",true);render();return;
      }
      if(tests.length&&!confirm("Associate this old draft with "+guidedPlatformLabel(selected)+" for editing? Its Assessment YAML will remain unchanged.")){
        render();return;
      }
      d.guidedPlatform=selected;d.changed=true;saveState();render();
      display("Target platform changed to "+guidedPlatformLabel(selected)+"; no Assessment YAML or Test semantics changed.");
    };
    const showCapability=()=>{
      if(!cap)return;
      const isText=cap.value==="independent.textfilecontent54",
        isRegistry=cap.value==="windows.registry";
      $("generic-line-group").hidden=!isText;
      $("generic-field-group").hidden=isText;
      $("generic-registry-group").hidden=!isRegistry;
      const registryHelp=$("generic-registry-type-help");
      registryHelp.hidden=!isRegistry;
      if(isRegistry){
        const m=guidedMaps.get("windows.registry");
        const choices=m?.native?.field_datatypes?.value||[];
        registryHelp.textContent="Registry storage type (type) uses the exact pinned enum dropdown. Comparing the stored value is not yet supported here: its "+choices.length+" eligible datatypes ("+choices.join(", ")+") require an explicit compatible datatype selector and validation.";
      }
      $("generic-line").required=isText;
      $("generic-registry-name").required=isRegistry;
      $("generic-path-label").textContent=isRegistry?"Windows Registry key":"Absolute Linux file or link to inspect";
      $("generic-path").placeholder=isRegistry?"SOFTWARE\\ExampleVendor\\ExampleApp":"/var/log/secure";
      newField.innerHTML=genericFieldOptions(undefined,cap.value);
      if(!isText)newFileValue();
    };
    function newFileValue(){
      const field=newField?.value,capability=cap?.value;
      const type=genericSupportedField(capability,field);
      if(!field||!type)return;
      const enumChoices=guidedValueEnums(capability,field);
      const value=type==="boolean"?false:type==="integer"?0:enumChoices?.[0]||"";
      $("generic-new-value-host").innerHTML=genericValue(type,value,capability,field);
    }
    if(cap){cap.onchange=showCapability;newField.onchange=newFileValue;showCapability()}
    const checkTitle=$("generic-check-title"),checkId=$("generic-check-id");
    let manualId=false;
    if(checkTitle){checkId.oninput=()=>{manualId=true};checkTitle.oninput=()=>{
      if(!manualId)checkId.value=suggestId(checkTitle.value,"-test")
    }}
    const add=$("generic-add-test");
    if(add)add.onsubmit=e=>{
      e.preventDefault();
      const capability=cap.value;
      genericChange(a=>genericNewTest(a,{
        title:checkTitle.value,id:checkId.value.trim(),capability,
        path:$("generic-path").value.trim(),line:$("generic-line").value,
        field:newField.value,value:$("generic-new-value-host")?.querySelector("#generic-value")?.value,
        hive:$("generic-hive").value,registryName:$("generic-registry-name").value.trim()
      }),"Added independent check");
    };
    $("content").querySelectorAll("[data-generic-rename]").forEach(e=>e.onchange=()=>{
      const old=e.dataset.genericRename,newId=e.value.trim();
      genericChange(a=>renameTestAndReferences({assessment:a},old,newId),"Updated Test ID and expression references");
    });
    $("content").querySelectorAll("[data-generic-path]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.genericPath,path=e.value.trim();
      genericChange(a=>{
        const t=a.tests[id],isRegistry=t.capability==="windows.registry";
        if(!path||/[\r\n]/.test(path)||(!isRegistry&&(!path.startsWith("/")||path.length<2)))
          throw Error(isRegistry?"Enter a nonempty Windows Registry key.":"Enter an absolute Linux path.");
        const ref=isRegistry?t.object.select.key:t.object.select.full_path,old=ref.equals;
        ref.equals=path;
        if(t.object.object_title?.endsWith(old))
          t.object.object_title=t.object.object_title.slice(0,-old.length)+path;
      },"Changed one Test collection selector");
    });
    $("content").querySelectorAll("[data-generic-hive]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.genericHive,hive=e.value;
      genericChange(a=>{
        const t=a.tests[id],allowed=guidedMaps.get("windows.registry")?.native?.selector_value_enums?.hive;
        if(t.capability!=="windows.registry"||!allowed?.includes(hive))throw Error("Unsupported Registry hive.");
        t.object.select.hive.equals=hive;
      },"Changed pinned Registry hive");
    });
    $("content").querySelectorAll("[data-generic-reg-name]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.genericRegName,name=e.value.trim();
      genericChange(a=>{
        if(!name||/[\r\n]/.test(name))throw Error("Enter a named Registry value.");
        const t=a.tests[id];
        if(t.capability!=="windows.registry")throw Error("Not a Registry Test.");
        t.object.select.name.equals=name;
      },"Changed Registry value name");
    });
    $("content").querySelectorAll("[data-generic-line]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.genericLine,line=e.value;
      genericChange(a=>{
        if(!line.trim()||/[\r\n]/.test(line))throw Error("Required text must be one nonempty complete line.");
        const t=a.tests[id];
        if(t.capability!=="independent.textfilecontent54"||!t.object.select.pattern||!t.states[0]?.text)
          throw Error("Not a supported text-line Test.");
        t.object.select.pattern.matches_regex=linePattern(line);
        t.states[0].text.equals=line;
      },"Updated text value and escaped collection pattern");
    });
    $("content").querySelectorAll("[data-generic-state]").forEach(e=>e.onchange=()=>{
      const id=e.dataset.genericState,index=Number(e.dataset.index),value=e.value;
      genericChange(a=>{
        const t=a.tests[id],state=t.states[index],field=Object.keys(state)[0];
        state[field].equals=genericTypedValue(field,value,t.capability);
      },"Changed expected file property");
    });
    $("content").querySelectorAll("[data-generic-remove-state]").forEach(e=>e.onclick=()=>{
      const id=e.dataset.genericRemoveState,index=Number(e.dataset.index);
      if(!confirm("Remove this expected field from the Test?"))return;
      genericChange(a=>{
        const t=a.tests[id];if(t.capability==="independent.textfilecontent54"||t.states.length<2)throw Error("At least one State is required.");
        t.states.splice(index,1);if(t.states.length<2)delete t.states_match;
      },"Removed one State and preserved other fields");
    });
    $("content").querySelectorAll("[data-generic-add-state]").forEach(form=>{
      const id=form.dataset.genericAddState,choice=form.querySelector("[data-generic-field-for]"),
        host=form.querySelector("[data-generic-value-host]");
      const refresh=()=>{
        const cap=doc()?.tree.assessment.tests[id]?.capability;
        const type=genericSupportedField(cap,choice.value),enums=guidedValueEnums(cap,choice.value);
        host.innerHTML=genericValue(type,type==="boolean"?false:type==="integer"?0:enums?.[0]||"",cap,choice.value,null);
      };
      choice.onchange=refresh;refresh();
      form.onsubmit=e=>{
        e.preventDefault();
        const field=choice.value,value=host.querySelector("input,select")?.value;
        genericChange(a=>{
          const t=a.tests[id];
          if(t.capability==="independent.textfilecontent54")throw Error("Text check uses an independently selected line.");
          if(t.states.some(s=>Object.hasOwn(s,field)))throw Error("Field already has a condition on this collected Item.");
          t.states.push({[field]:{equals:genericTypedValue(field,value,t.capability),require:"at_least_one_exists_and_all_match"}});
          if(t.states.length===2)t.states_match="all";
        },"Added same-file expected field");
      };
    });
    $("content").querySelectorAll("[data-generic-remove-test]").forEach(e=>e.onclick=()=>{
      const id=e.dataset.genericRemoveTest;
      if(!confirm("Delete this Test and unlink it from the Assessment expression?"))return;
      genericChange(a=>{
        if(!guidedExpressionLeaves(a.evaluate).includes(id))
          throw Error("Test is not referenced; review Source.");
        const next=guidedRemoveLeaf(a.evaluate,id);
        delete a.tests[id];
        if(next)a.evaluate=next;
        else delete a.evaluate;
      },"Removed Test and repaired Assessment-level references");
    });
    $("content").querySelectorAll("[data-generic-nest]").forEach(b=>b.onclick=()=>{
      const path=JSON.parse(decodeURIComponent(b.dataset.genericNest));
      const selector=$("content").querySelector('[data-generic-pair="'+b.dataset.genericNest+'"]');
      const index=Number(selector?.value);
      if(!Number.isInteger(index))return;
      genericChange(a=>{
        const group=guidedGroupAt(a.evaluate,path),op=group.all?"all":"any",children=group[op];
        if(!children[index]?.test||!children[index+1]?.test)throw Error("Choose adjacent Test leaves to group.");
        const pair=children.slice(index,index+2);
        children.splice(index,2,{any:pair});
      },"Created a nested OR group with two adjacent Tests");
    });
    $("content").querySelectorAll("[data-generic-group-op]").forEach(e=>e.onchange=()=>{
      const path=JSON.parse(decodeURIComponent(e.dataset.genericGroupOp)),op=e.value;
      if(!["all","any"].includes(op)){render();return}
      if(!confirm("Change this nested group's logic to "+op.toUpperCase()+"? This changes assessment meaning.")){render();return}
      genericChange(a=>{
        const group=guidedGroupAt(a.evaluate,path);
        const children=group.all||group.any;
        delete group.all;delete group.any;group[op]=children;
      },"Changed nested branch operator");
    });
    const combo=$("generic-logic");
    if(combo)combo.onchange=()=>{
      if(!confirm("Change Assessment check logic to "+combo.value.toUpperCase()+"? The overall result can change.")){render();return}
      genericChange(a=>{
        const old=a.evaluate,leaves=old?.all||old?.any;
        if(!Array.isArray(leaves)||leaves.length<2)throw Error("Expected a root AND/OR group.");
        a.evaluate={[combo.value]:leaves};
      },"Changed Assessment AND/OR logic");
    };
  }

  function renderStandaloneCreation(){
    if(newCreateMode==="blank"){renderBlankCreation();return}
    $("crumb").textContent="MY ASSESSMENTS / NEW";$("title").textContent="New Assessment";
    $("state").textContent="Draft · no scanner";
    $("notice").textContent="Not linked to a STIG or Rule. Author a standalone text-file check against the pinned 0.4-A base draft.";
    $("content").innerHTML='<section class="card"><h3>Create an Assessment without a STIG</h3>'+
      '<p>First describe what to check. Then use Guided to review and change every choice.</p>'+
      '<button type="button" id="create-blank" class="button">Start with a blank goal instead</button>'+
      '<form id="standalone-create" class="standalone-create">'+
      '<label for="create-title">What security requirement should be checked?</label><input name="title" id="create-title" required value="The RHEL login banner must contain the required notice">'+
      '<label for="create-capability">How should we inspect it?</label><select name="capability" id="create-capability">'+
      '<option value="independent.textfilecontent54">Read and match text in a file — independent.textfilecontent54</option>'+
      '<option value="unix.symlink" disabled>Resolve a symbolic link — unix.symlink (coming later)</option>'+
      '<option value="windows.registry" disabled>Read Windows Registry settings — windows.registry (coming later)</option>'+
      '<option value="windows.wmi.query" disabled>Query Windows system information — windows.wmi.query (coming later)</option></select>'+
      '<p class="help">The selected capability determines the source prompts. Other capabilities are not yet available in this authoring preset.</p>'+
      '<label for="create-id">Suggested Assessment ID (editable)</label><input name="id" id="create-id" required value="custom.rhel-login-banner-required-line" spellcheck="false">'+
      '<label for="create-source-title">Name this data source (editable)</label><input name="sourceTitle" id="create-source-title" required value="Read RHEL login banner in /etc/issue">'+
      '<p class="help">This is an inline collection and needs no Object ID. Reusable shared Objects will get capability-specific, editable names ending in -object.</p>'+
      '<label for="create-file">Which text file should be read?</label><input name="file" id="create-file" required value="/etc/issue" spellcheck="false">'+
      '<p class="help">/etc/issue is a common local login-banner file. It does not automatically prove which banner is shown by SSH or another login service.</p>'+
      '<label for="create-line">What exact line must appear? (user-defined)</label><textarea name="line" id="create-line" required rows="3" spellcheck="false" placeholder="Type the required text."></textarea>'+
      '<p class="help">This preset checks complete matching lines; it does not compare every byte or render a system login banner.</p>'+
      '<label for="create-scope">How many independent checks do you need?</label><select name="scope" id="create-scope">'+
      '<option value="single">One required line (one capability, one Test)</option>'+
      '<option value="protected">Two required lines + file owner and write permissions (two capabilities, three Tests)</option></select>'+
      '<div id="create-extra-line-wrap" hidden><label for="create-extra-line">Second required line</label>'+
      '<textarea name="extraLine" id="create-extra-line" rows="3" spellcheck="false" placeholder="A different required banner line"></textarea>'+
      '<p class="help">The additional permission check uses unix.file and expects root ownership, group_write=false and other_write=false on this same path.</p></div>'+
      '<button class="button primary" type="submit">Create draft and open Guided →</button></form>'+
      '<p class="help" id="create-error" role="alert"></p></section>';
    const goBlank=$("create-blank");if(goBlank)goBlank.onclick=()=>{newCreateMode="blank";render()};
    const goal=$("create-title"),sourceName=$("create-source-title"),fileName=$("create-file"),capability=$("create-capability");
    const scope=$("create-scope"),extra=$("create-extra-line"),extraWrap=$("create-extra-line-wrap");
    scope.onchange=()=>{const multi=scope.value==="protected";extraWrap.hidden=!multi;extra.required=multi};
    let sourceNameManuallyEdited=false;
    sourceName.oninput=()=>{sourceNameManuallyEdited=true};
    const suggest=()=>{
      if(!sourceNameManuallyEdited)sourceName.value=suggestedSourceName(capability.value,goal.value,fileName.value);
    };
    goal.oninput=suggest;fileName.oninput=suggest;capability.onchange=suggest;
    $("standalone-create").onsubmit=e=>{
      e.preventDefault();
      const form=e.currentTarget;
      try{
        const a=buildBannerAssessment(form.elements.namedItem("id").value.trim(),
          form.elements.namedItem("title").value,
          form.elements.namedItem("file").value,
          form.elements.namedItem("line").value,
          form.elements.namedItem("capability").value,
          form.elements.namedItem("sourceTitle").value);
        if(scope.value==="protected")buildProtectedBannerAssessment(a,extra.value);
        const raw=jsyaml.dump(a,{lineWidth:105,noRefs:true});
        const p=parse(raw);
        addDoc(p.id+".assessment.yaml",raw,"Locally created draft");
        docs.get("assessment:"+p.id).changed=true;
        standaloneId=p.id;creatingStandalone=false;chosen=null;step=0;view="guided";
        saveState();library();render();
        display("Standalone Assessment created as a local draft. No scanner has verified it.");
      }catch(err){$("create-error").textContent=err.message;display(err.message,true)}
    };
  }
  function bannerParts(){
    const a=doc()?.tree.assessment,t=a?.tests?.[BANNER_TEST],obj=t?.object;
    return {a,t,obj,line:t?.states?.[0]?.text?.equals,
      path:obj?.select?.full_path?.equals};
  }
  function standaloneWizard(){
    if(doc()?.guidedGeneric)return genericWizard();
    if(multiBannerParts())return standaloneMultiWizard();
    const {a,t,obj,line,path}=bannerParts();
    if(!a||!t||!obj||typeof line!=="string")
      return '<section class="card"><h3>Source was changed</h3><p>This no longer matches the guided single-line text preset. Source editing is still available.</p><button id="gotoSource" class="button">Review Source</button></section>';
    const steps=["Describe","Find the file","Required text","Decide success","Review"];
    const nav='<div class="steps">'+steps.map((name,i)=>'<button data-step="'+i+'" class="'+(step===i?"selected":"")+'">'+(i+1)+'. '+name+'</button>').join("")+'</div>';
    let content="";
    if(step===0)content='<section class="card"><h3>1 · What are we checking?</h3>'+
      field(["assessment","assessment_title"],"Requirement (plain English)",a.assessment_title)+
      field(["assessment","id"],"Assessment identifier",a.id)+
      '<p class="help">An independent automated Assessment. It can be reused or linked to a Rule later, without a dummy STIG.</p>'+
      '</section>';
    if(step===1)content='<section class="card"><h3>2 · Where should we look?</h3>'+
      '<p><strong>Read a text file</strong> using the selected textfilecontent54 capability; only its supported inputs are shown.</p>'+
      field(["assessment","tests",BANNER_TEST,"object","object_title"],"Data source description",obj.object_title)+
      '<p class="help">Inline collection: no Object ID required. A reusable source would receive an editable capability-specific -object ID.</p>'+
      field(["assessment","tests",BANNER_TEST,"object","select","full_path","equals"],"File to inspect",path)+
      '<p class="help">Choose the exact file; this check does not search other directories.</p>'+
      field(["assessment","tests",BANNER_TEST,"object","filesystem"],"Filesystem scope",obj.filesystem,["all","local","same"])+
      '<p class="help">All = no local filesystem restriction (inherited OVAL default). Local restricts to local filesystems. Same means the filesystem containing the selected path. Choose explicitly; no silent conversion.</p></section>';
    if(step===2)content='<section class="card"><h3>3 · What text must be present?</h3>'+
      '<label for="banner-line">Exact required line</label><textarea rows="3" id="banner-line" spellcheck="false">'+esc(line)+'</textarea>'+
      '<p class="help">The editor escapes regular-expression punctuation when constructing the collection pattern. It checks one complete matching line, not the entire banner text.</p>'+
      '<details><summary>Show the generated search pattern</summary><code>'+esc(obj.select?.pattern?.matches_regex||"")+'</code></details></section>';
    if(step===3)content='<section class="card"><h3>4 · When should this check succeed?</h3>'+
      '<p><strong>At least one line must be found, and all selected matching lines must satisfy the expected text.</strong></p>'+
      field(["assessment","tests",BANNER_TEST,"require"],"Number of matching lines required",t.require,
        ["at_least_one_exists_and_all_match","at_least_one_exists_and_some_match","only_one_exists_and_matches"])+
      field(["assessment","tests",BANNER_TEST,"states",0,"text","require"],"Required text values per line",t.states[0].text.require,
        ["at_least_one_exists_and_all_match","at_least_one_exists_and_some_match"])+
      '<details><summary>Advanced: how text is collected</summary><div class="structure-children">'+
      field(["assessment","tests",BANNER_TEST,"object","collect","ignore_case"],"Ignore case",obj.collect.ignore_case,["true","false"])+
      field(["assessment","tests",BANNER_TEST,"object","collect","multiline"],"Match line boundaries",obj.collect.multiline,["true","false"])+
      field(["assessment","tests",BANNER_TEST,"object","collect","singleline"],"Allow dot to match newline",obj.collect.singleline,["true","false"])+
      field(["assessment","tests",BANNER_TEST,"object","collect","item_creation"],"When to create collected items",obj.collect.item_creation,["all_object_elements_fullfilled","filepath_exists"])+
      '</div></details></section>';
    if(step===4)content='<section class="card"><h3>5 · Review the new Assessment</h3>'+
      '<p><strong>Where:</strong> '+esc(path)+'</p><p><strong>Required complete line:</strong> '+esc(line)+'</p>'+
      '<p><strong>Success rule:</strong> '+esc(requirementDescription(t.require))+'</p>'+
      '<p><strong>Not scanner-verified:</strong> No real RHEL host was inspected. Schema/reference diagnostics and native evaluation are not connected.</p>'+
      '<details><summary>See source representation</summary><pre>'+esc(doc().source)+'</pre></details></section>';
    return nav+content+'<div class="actions">'+(step>0?'<button id="prev" class="button">Previous</button>':"")+
      (step<4?'<button id="next" class="button primary">Next →</button>':'<button id="gotoSource" class="button primary">Review YAML Source</button>')+
      '<button id="gotoGraph" class="button">Graphical overview</button></div>';
  }
  function standaloneOverview(){
    if(doc()?.guidedGeneric){const a=doc().tree.assessment;return Object.keys(a.tests||{}).length?overview():'<section class="card"><h3>No checks yet</h3><p>Return to Guided to add a first capability-backed check. This incomplete draft cannot yet be meaningfully evaluated.</p></section>'}
    const {line,path}=bannerParts();
    return '<section class="card"><h3>What this check means</h3>'+
      '<p><strong>Look at:</strong> '+esc(path||"the authored file")+'</p>'+
      '<p><strong>Find:</strong> a complete line matching '+esc(line??"the authored text")+'</p>'+
      '<p><strong>Require:</strong> at least one selected line to exist and match.</p>'+
      '<p class="help">No STIG association. The Source tab exposes the full native Assessment. No scanner result is available.</p>'+
      '</section>'+overview();
  }
  function bindStandaloneEditors(){
    const editor=$("banner-line");if(!editor)return;
    editor.onchange=()=>{
      const textValue=editor.value;
      if(!textValue.trim()||/[\r\n]/.test(textValue)){display("Enter one nonempty line of required text.",true);render();return}
      const d=doc(),p=bannerParts(),previous=structuredClone(d.tree);
      if(!p.t?.object?.select?.pattern||!p.t?.states?.[0]?.text){display("This draft no longer has a matching text field.",true);return}
      try{
        p.t.object.select.pattern.matches_regex=linePattern(textValue);
        p.t.states[0].text.equals=textValue;
        d.source=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});
        parse(d.source);d.changed=true;saveState();render();
        display("Required line and escaped search pattern updated together; review YAML before export.");
      }catch(err){d.tree=previous;display(err.message,true);render()}
    };
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
    if(creatingStandalone){renderStandaloneCreation();return}
    if(!r&&!standaloneId){$("crumb").textContent="LOCAL BROWSER WORKSPACE";$("title").textContent="SCAP-NG Assessment Studio";$("content").innerHTML='<section class="card"><h3>Select a STIG, then a Rule</h3><p>Expand a STIG on the left to view its Rules. No scanner is connected.</p></section>';return}
    $("crumb").textContent=standaloneId?"MY ASSESSMENTS / "+standaloneId:r.stig.name+" / "+r.id+" · "+(r.version||"source revision not specified");
    $("title").textContent=standaloneId?(doc()?.tree.assessment.assessment_title||standaloneId):r.title;
    $("state").textContent="No scanner connected";
    const d=doc();
    if(!d){
      const manual=manualDoc();
      if(manual){
        $("notice").textContent="Manual Assessment from pinned source · scanner not connected.";
        $("content").innerHTML=ruleNavigation(r)+(view==="source"?'<div class="card"><h3>Manual YAML source</h3><textarea id="rawyaml" class="editor" spellcheck="false">'+esc(manual.source)+'</textarea><div class="actions"><button id="applyYAML" class="button primary">Apply YAML</button><span id="rawStatus" class="help">Draft source</span></div></div>':showManualAssessment(r,manual));
        bindRuleNavigation();
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
    $("notice").textContent=(r?.status==="needs-review"?r.reason+" · ":"")+"Source: "+d.origin+" · Pre-alpha draft. No authoritative schema verification or scanner evaluation.";
    let html=standaloneId?(view==="guided"?standaloneWizard():view==="graphical"?standaloneOverview():view==="source"?sourceView():view==="split"?'<div class="split"><div>'+standaloneOverview()+'</div>'+rawEditor()+'</div>':fixtures()):
      view==="guided"?wizard():view==="graphical"?overview():view==="source"?sourceView():view==="split"?'<div class="split"><div>'+overview()+'</div>'+rawEditor()+'</div>':fixtures();
    $("content").innerHTML=(standaloneId?"":ruleNavigation(r))+html;
    bindRuleNavigation();
    $("content").querySelectorAll("[data-select-test]").forEach(b=>b.onclick=()=>{selectedTest=b.dataset.selectTest;render();if(innerWidth<780)$("test-inspector")?.scrollIntoView({block:"start"})});
    $("content").querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{step=Number(b.dataset.step);render()});
    bindStandaloneEditors();
    bindMultiWizardEditors();
    bindGenericEditors();
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
      if(typeof orig==="boolean"){if(!["true","false"].includes(v)){display("Invalid Boolean",true);return}v=v==="true"}
      if(standaloneId&&path.join(".")==="assessment.id"){
        if(!/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(v)||docs.has("assessment:"+v)){display("Use a distinct, meaningful lowercase Assessment ID.",true);render();return}
        docs.delete("assessment:"+standaloneId);
        d.id=v;standaloneId=v;d.key="assessment:"+v;d.name=v+".assessment.yaml";
        docs.set(d.key,d);
      }
      if(standaloneId&&path.includes("full_path")&&(!v.startsWith("/")||v.length<2)){display("Enter an absolute Linux file path.",true);render();return}
      putNode(d.tree,path,v);
      try{d.source=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});d.changed=true;saveState();display("Draft changed at "+path.slice(-3).join(" / ")+" — YAML reformatted; review before export");render()}catch(ex){putNode(d.tree,path,orig);display(ex.message,true)}
    });
    $("content").querySelectorAll("[data-rename-key]").forEach(e=>e.onchange=()=>{
      const path=JSON.parse(decodeURIComponent(e.dataset.renameKey)),d=doc();
      const parent=path.slice(0,-1),previous=getNode(d.tree,parent);
      const from=String(path[path.length-1]),to=e.value.trim();
      if(to===from){render();return}
      if(!to||Object.hasOwn(previous||{},to)){
        display(!to?"Field name cannot be empty.":"Record already contains a field named "+to+".",true);
        render();return;
      }
      if(!confirm("Rename record field "+from+" to "+to+"? This changes which collected field is checked; the editor cannot verify the assessment result.")){
        render();return;
      }
      try{
        renameMappingKey(d.tree,path,to);
        const next=jsyaml.dump(d.tree,{lineWidth:105,noRefs:true});
        parse(next);
        d.source=next;d.changed=true;saveState();
        display("Renamed record field "+from+" → "+to+" in draft — review YAML before export; formatting may change.");
        render();
      }catch(err){
        putNode(d.tree,parent,previous);
        display("Record field not renamed: "+err.message,true);
        render();
      }
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
  $("query").oninput=e=>{search=e.target.value.toLowerCase();expandedStig=null;chosen=null;standaloneId=null;creatingStandalone=false;selectedTest=null;library();render()};
  $("tabs").querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $("new-assessment").onclick=()=>{
    standaloneId=null;chosen=null;creatingStandalone=true;newCreateMode="blank";selectedTest=null;step=0;view="guided";library();render();
  };
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
    const guidedLoad=loadGuidedMappings();
    const got=await Promise.all(seeded.map(async ([path])=>{
      try{const url=src+path;const res=await fetch(url,{cache:"force-cache"});if(!res.ok)throw Error("HTTP "+res.status);return {name:path.split("/").pop(),text:await res.text(),url,path}}
      catch(e){return {err:path+": "+e.message}}
    }));
    let failures=[];
    for(const item of got){if(item.err){failures.push(item.err);continue}try{addDoc(item.name,item.text,"Pinned source "+snap.slice(0,10),false,item.path)}catch(e){failures.push(item.name+": "+e.message)}}
    await Promise.all([capabilityLoad,guidedLoad,loadCompleteCatalog()]);
    readState();indexRules();chosen=null;expandedStig=null;library();render();
    display(catalogStatus+(failures.length?" Some sample fixtures unavailable: "+failures[0]:""),!!failures.length);
  }
  init();
})();
