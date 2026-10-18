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
  function open(id){chosen=id;selectedTest=null;view="graphical";step=0;dirtySource=false;library();render()}
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
    return s.length>165?s.slice(0,162)+"…":s;
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
  function logic(n,a,refs,depth=0){
    a=a||doc()?.tree.assessment||{};
    refs=refs||(()=>{const counts={};countTestReferences(a.evaluate,counts);return counts})();
    if(!n)return '<p class="warning">No evaluation expression is defined.</p>';
    if(typeof n.test==="string"){
      const t=a.tests?.[n.test], exists=!!t;
      return '<button class="logic-leaf '+(selectedTest===n.test?"active":"")+'" data-select-test="'+esc(n.test)+'" '+(!exists?'disabled title="Referenced Test not loaded"':"")+'><span class="logic-leaf-title">'+esc(t?.test_title||n.test)+'</span><span class="logic-leaf-summary">'+esc(t?summarizeTest(t):"Definition unavailable")+'</span><small>'+esc(n.test)+(refs[n.test]>1?' · reused in '+refs[n.test]+' branches':"")+(!exists?" · unresolved":"")+'</small></button>';
    }
    if(n.not)return '<details class="logic-group" open><summary>NOT — reverse the following condition</summary><div class="logic-children">'+logic(n.not,a,refs,depth+1)+'</div></details>';
    if(Array.isArray(n.all)||Array.isArray(n.any)){
      const op=Array.isArray(n.all)?"all":"any",list=n[op];
      return '<details class="logic-group" '+(depth<2?"open":"")+'><summary><strong>'+(op==="all"?"AND":"OR")+'</strong> — '+(op==="all"?"every condition must be true":"any condition may be true")+' <small>('+list.length+')</small></summary><div class="logic-children">'+list.map(x=>logic(x,a,refs,depth+1)).join("")+'</div></details>';
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
      const where=Object.entries(o.select).slice(0,3).map(([name,pred])=>shortClause(pred,name)).filter(Boolean);
      return {text:source+(where.length?" matching "+where.join(" and "):""),detail:ref?"Shared source: "+ref:"Local source"};
    }
    if(o.collect?.query)return {text:source+" queried with "+o.collect.query,detail:ref?"Shared source: "+ref:"Local source"};
    if(o.collect?.command){
      const cmd=o.collect.command;
      const title=typeof cmd==="object"&&cmd.variable?a.variables?.[cmd.variable]?.title||cmd.variable:null;
      return {text:source+" gathered by "+(title?"command built from "+title:typeof cmd==="string"?cmd:"a defined command"),detail:ref?"Shared source: "+ref:"Local source"};
    }
    if(o.set)return {text:source+" derived from a "+String(o.set.operator||"specified")+" set of collections; see source dependencies",detail:ref?"Shared source: "+ref:"Local source"};
    if(o.for_each)return {text:source+" collected for each "+String(o.for_each.item||"item")+" from "+String(o.for_each.in||"the referenced source"),detail:ref?"Shared source: "+ref:"Local source"};
    return {text:source+(o.object_title?" ("+o.object_title+")":""),detail:ref?"Shared source: "+ref:"Local source"};
  }
  function oneFieldEditor(id,t){
    const states=t.states;
    if(!Array.isArray(states)||states.length!==1)return "";
    const one=states[0];
    if(!one||Array.isArray(one)||typeof one!=="object")return "";
    const fields=Object.entries(one);
    if(fields.length!==1)return "";
    const [name,matcher]=fields[0];
    if(!matcher||typeof matcher!=="object"||Array.isArray(matcher)||matcher.record||matcher.and||matcher.or)return "";
    const comparison=["equals","case_insensitive_equals","matches_regex","greater_than_or_equal","less_than_or_equal","greater_than","less_than"]
      .filter(x=>Object.hasOwn(matcher,x));
    if(comparison.length!==1||matcher[comparison[0]]===null||typeof matcher[comparison[0]]==="object")return "";
    const op=comparison[0];
    const exactPath=["assessment","tests",id,"states",0,name,op];
    return '<div class="inline-predicate"><div class="help">Edit this matching value without leaving the check</div>'+
      field(exactPath,name+" "+prettyName(op)+" (States)",matcher[op])+
      (matcher.require?'<p class="help">Matching requirement for this field (require): '+esc(requirementDescription(matcher.require))+'</p>':"")+
      '</div>';
  }
  function combinedReading(a,id,t){
    const from=humanCollection(a,t),expectation=summarizeTest(t);
    const mode=t.states_match==="any"?"At least one alternative must match":t.states_match==="all"?"All alternatives must match":t.states_match==="none"?"No alternative may match":t.states_match==="one"?"Exactly one alternative must match":"State combination shown in details";
    return '<section class="combined-check" aria-label="Readable test description">'+
      '<h4>What this check means</h4>'+
      '<p class="check-sentence"><strong>Look at</strong> '+esc(from.text)+'.</p>'+
      '<p class="check-sentence"><strong>Require</strong> '+esc(expectation)+'.</p>'+
      '<p class="check-scope"><strong>Across collected entries:</strong> '+esc(requirementDescription(t.collected_items_require))+
      (t.states_match?' · <strong>Alternatives:</strong> '+esc(mode):"")+
      (t.state_fields_require?' · <strong>Across State fields:</strong> '+esc(requirementDescription(t.state_fields_require)):"")+
      '</p>'+oneFieldEditor(id,t)+
      '<p class="help">This is a readable projection, not a second source format. Expanded details preserve all authored requirements and collection references.</p>'+
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
    $("content").querySelectorAll("[data-select-test]").forEach(b=>b.onclick=()=>{selectedTest=b.dataset.selectTest;render();if(innerWidth<780)$("test-inspector")?.scrollIntoView({block:"start"})});
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
    display("Loading six pinned source-backed Rule/Assessment examples from public GitHub…");
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
