import assert from "node:assert/strict";
export class MemoryFirestore {
  records = new Map();
  queue = Promise.resolve();
  doc(path) { return { kind: "document", path, id: path.split("/").at(-1), get: async () => this.snapshot(path) }; }
  snapshot(path) {
    const data = this.records.get(path);
    return { id: path.split("/").at(-1), ref: this.doc(path), exists: data !== undefined, data: () => data === undefined ? undefined : structuredClone(data) };
  }
  collection(path) {
    const db=this;
    const query=(filters=[],limit=Infinity)=>({
      kind:"query", path,
      doc:id=>db.doc(path+"/"+id),
      where:(field,op,value)=>query([...filters,[field,op,value]],limit),
      limit:value=>query(filters,value),
      get:async()=>{
        const docs=[...db.records.keys()].filter(key=>key.startsWith(path+"/")&&!key.slice(path.length+1).includes("/")).map(key=>db.snapshot(key)).filter(doc=>filters.every(([field,op,value])=>op==="=="?doc.data()[field]===value:op===">="?doc.data()[field]>=value:doc.data()[field]<value)).slice(0,limit);
        return {docs,size:docs.length,empty:docs.length===0};
      },
    });
    return query();
  }
  async runTransaction(callback) {
    const result=this.queue.then(async()=>{
      const writes=[];
      const transaction={
        get:async ref=>{assert.equal(writes.length,0,"Firestore transactions must read before writing");return ref.get();},
        create:(ref,data)=>writes.push(["create",ref.path,data]),
        set:(ref,data)=>writes.push(["set",ref.path,data]),
        update:(ref,data)=>writes.push(["update",ref.path,data]),
        delete:ref=>writes.push(["delete",ref.path]),
      };
      const value=await callback(transaction);
      const next=new Map(this.records);
      for(const [type,path,data]of writes){
        if(type==="create")assert(!next.has(path));
        if(type==="update")assert(next.has(path));
        if(type==="delete")next.delete(path);
        else next.set(path,type==="update"?{...next.get(path),...structuredClone(data)}:structuredClone(data));
      }
      this.records=next;
      return value;
    });
    this.queue=result.catch(()=>{});
    return result;
  }
  batch() {
    const paths=[];
    return {delete:ref=>paths.push(ref.path),commit:async()=>paths.forEach(path=>this.records.delete(path))};
  }
}

