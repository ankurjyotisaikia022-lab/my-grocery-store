const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const URL = require('url').URL;

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-admin-password';
const STORE_NAME = process.env.STORE_NAME || 'ZipBasket';
const STORE_CITY = process.env.STORE_CITY || 'Your City';
const STORE_UPI_ID = process.env.STORE_UPI_ID || '';
const STORE_PHONE = process.env.STORE_PHONE || '';

const seed = {
  products: [
    {id:'p1', name:'Fresh Bananas', category:'Fruits', price:45, unit:'6 pcs', stock:30, emoji:'🍌', description:'Naturally sweet everyday bananas', active:true},
    {id:'p2', name:'Red Apples', category:'Fruits', price:149, unit:'1 kg', stock:18, emoji:'🍎', description:'Crisp and juicy apples', active:true},
    {id:'p3', name:'Full Cream Milk', category:'Dairy', price:34, unit:'500 ml', stock:40, emoji:'🥛', description:'Daily fresh milk', active:true},
    {id:'p4', name:'Brown Bread', category:'Bakery', price:45, unit:'1 pack', stock:16, emoji:'🍞', description:'Soft sliced bread', active:true},
    {id:'p5', name:'Potato Chips', category:'Snacks', price:20, unit:'1 pack', stock:50, emoji:'🥔', description:'Crunchy snack for any time', active:true},
    {id:'p6', name:'Orange Juice', category:'Drinks', price:80, unit:'1 L', stock:12, emoji:'🧃', description:'Refreshing fruit drink', active:true},
    {id:'p7', name:'Eggs', category:'Dairy', price:72, unit:'6 pcs', stock:20, emoji:'🥚', description:'Everyday kitchen essential', active:true},
    {id:'p8', name:'Tomatoes', category:'Vegetables', price:35, unit:'500 g', stock:25, emoji:'🍅', description:'Fresh kitchen tomatoes', active:true},
    {id:'p9', name:'Instant Noodles', category:'Snacks', price:15, unit:'1 pack', stock:45, emoji:'🍜', description:'Quick and easy snack', active:true},
    {id:'p10', name:'Dishwashing Liquid', category:'Home Care', price:99, unit:'500 ml', stock:10, emoji:'🧴', description:'For everyday dish cleaning', active:true},
    {id:'p11', name:'Chocolate Bar', category:'Snacks', price:40, unit:'1 bar', stock:24, emoji:'🍫', description:'A little sweet treat', active:true},
    {id:'p12', name:'Bottled Water', category:'Drinks', price:20, unit:'1 L', stock:60, emoji:'💧', description:'Packaged drinking water', active:true}
  ],
  orders: [],
  settings: {city:STORE_CITY, deliveryFee:25, freeDeliveryAbove:499, minOrder:99, eta:'20–35 min', upiId:STORE_UPI_ID, phone:STORE_PHONE, storeName:STORE_NAME}
};
function readData(){
  try { return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }
  catch { fs.writeFileSync(DATA_FILE, JSON.stringify(seed,null,2)); return JSON.parse(JSON.stringify(seed)); }
}
let db = readData();
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); }
const sessions = new Set();
function send(res, status, data, headers={}) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS', ...headers});
  res.end(JSON.stringify(data));
}
function body(req){ return new Promise((resolve,reject)=>{let s=''; req.on('data',c=>s+=c); req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});});}
function safeProduct(p){ return {id:p.id,name:p.name,category:p.category,price:p.price,unit:p.unit,stock:p.stock,emoji:p.emoji,description:p.description,active:p.active}; }
function authorized(req){ const t=(req.headers.authorization||'').replace(/^Bearer\s+/,''); return !!t && sessions.has(t); }
const server = http.createServer(async (req,res)=>{
  if(req.method==='OPTIONS'){ res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); return res.end(); }
  const u = new URL(req.url, 'http://localhost');
  const route = u.pathname;
  try {
    if(route==='/api/config' && req.method==='GET') return send(res,200,{storeName:db.settings.storeName,city:db.settings.city,phone:db.settings.phone,eta:db.settings.eta});
    if(route==='/api/products' && req.method==='GET') return send(res,200,db.products.filter(p=>p.active && p.stock>0).map(safeProduct));
    if(route==='/api/admin/login' && req.method==='POST'){
      const b=await body(req);
      if(!ADMIN_PASSWORD || ADMIN_PASSWORD==='change-this-admin-password' || b.password!==ADMIN_PASSWORD) return send(res,401,{error:'Invalid password. Set ADMIN_PASSWORD in .env first.'});
      const token=crypto.randomBytes(32).toString('hex'); sessions.add(token); return send(res,200,{token});
    }
    if(route.startsWith('/api/admin/')){
      if(!authorized(req)) return send(res,401,{error:'Please log in as admin.'});
      if(route==='/api/admin/products' && req.method==='GET') return send(res,200,db.products);
      if(route==='/api/admin/products' && req.method==='POST'){
        const b=await body(req); if(!b.name || !Number.isFinite(Number(b.price))) return send(res,400,{error:'Product name and valid price are required.'});
        const p={id:'p'+crypto.randomBytes(5).toString('hex'),name:String(b.name).slice(0,100),category:String(b.category||'Essentials').slice(0,50),price:Math.max(0,Number(b.price)),unit:String(b.unit||'1 pc').slice(0,30),stock:Math.max(0,Math.floor(Number(b.stock)||0)),emoji:String(b.emoji||'🛍️').slice(0,8),description:String(b.description||'').slice(0,180),active:b.active!==false};
        db.products.unshift(p); save(); return send(res,201,p);
      }
      const productMatch=route.match(/^\/api\/admin\/products\/([^/]+)$/);
      if(productMatch && req.method==='PUT'){
        const p=db.products.find(x=>x.id===productMatch[1]); if(!p) return send(res,404,{error:'Product not found'});
        const b=await body(req); for(const k of ['name','category','unit','emoji','description']) if(b[k]!==undefined)p[k]=String(b[k]);
        for(const k of ['price','stock']) if(b[k]!==undefined && Number.isFinite(Number(b[k])))p[k]=Math.max(0,Number(b[k]));
        if(b.active!==undefined)p.active=!!b.active; save(); return send(res,200,p);
      }
      if(productMatch && req.method==='DELETE'){db.products=db.products.filter(x=>x.id!==productMatch[1]);save();return send(res,200,{ok:true});}
      if(route==='/api/admin/orders' && req.method==='GET') return send(res,200,db.orders);
      const orderMatch=route.match(/^\/api\/admin\/orders\/([^/]+)$/);
      if(orderMatch && req.method==='PUT'){
        const o=db.orders.find(x=>x.id===orderMatch[1]);if(!o)return send(res,404,{error:'Order not found'});
        const b=await body(req); if(['Placed','Confirmed','Packed','Out for delivery','Delivered','Cancelled'].includes(b.status))o.status=b.status; save();return send(res,200,o);
      }
      if(route==='/api/admin/settings' && req.method==='GET') return send(res,200,db.settings);
      if(route==='/api/admin/settings' && req.method==='PUT'){
        const b=await body(req);
        for(const k of ['city','eta','upiId','phone','storeName']) if(b[k]!==undefined)db.settings[k]=String(b[k]).slice(0,120);
        for(const k of ['deliveryFee','freeDeliveryAbove','minOrder']) if(b[k]!==undefined && Number.isFinite(Number(b[k])))db.settings[k]=Math.max(0,Number(b[k]));
        save();return send(res,200,db.settings);
      }
      if(route==='/api/admin/logout' && req.method==='POST'){sessions.delete((req.headers.authorization||'').replace(/^Bearer\s+/,''));return send(res,200,{ok:true});}
      return send(res,404,{error:'Admin endpoint not found'});
    }
    if(route==='/api/orders' && req.method==='POST'){
      const b=await body(req);
      if(!b.customerName || !b.phone || !b.address || !Array.isArray(b.items) || !b.items.length) return send(res,400,{error:'Please enter your name, phone, address and add items.'});
      if(!/^[0-9+\-\s()]{8,16}$/.test(String(b.phone))) return send(res,400,{error:'Please enter a valid phone number.'});
      const items=[]; let subtotal=0;
      for(const line of b.items){
        const p=db.products.find(x=>x.id===line.id && x.active);
        const qty=Math.floor(Number(line.qty));
        if(!p || !Number.isInteger(qty) || qty<1 || qty>20) return send(res,400,{error:'One of your products is unavailable. Refresh and try again.'});
        if(p.stock<qty) return send(res,400,{error:`Only ${p.stock} left for ${p.name}.`});
        items.push({id:p.id,name:p.name,price:p.price,qty,unit:p.unit}); subtotal+=p.price*qty;
      }
      if(subtotal<db.settings.minOrder) return send(res,400,{error:`Minimum order value is ₹${db.settings.minOrder}.`});
      for(const line of items){const p=db.products.find(x=>x.id===line.id);p.stock-=line.qty;}
      const deliveryFee=subtotal>=db.settings.freeDeliveryAbove?0:Number(db.settings.deliveryFee);
      const paymentMethod=['COD','UPI'].includes(b.paymentMethod)?b.paymentMethod:'COD';
      const order={id:'ZB'+Date.now().toString().slice(-8),createdAt:new Date().toISOString(),customerName:String(b.customerName).slice(0,100),phone:String(b.phone).slice(0,20),address:String(b.address).slice(0,500),notes:String(b.notes||'').slice(0,300),items,subtotal,deliveryFee,total:subtotal+deliveryFee,paymentMethod,paymentStatus:paymentMethod==='COD'?'Pay on delivery':'UPI payment not verified',status:'Placed'};
      db.orders.unshift(order);save();
      const upiLink=db.settings.upiId && paymentMethod==='UPI' ? `upi://pay?pa=${encodeURIComponent(db.settings.upiId)}&pn=${encodeURIComponent(db.settings.storeName)}&am=${order.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order '+order.id)}` : null;
      return send(res,201,{order,upiLink});
    }
    if(route.startsWith('/api/orders/') && req.method==='GET'){
      const id=route.split('/').pop(); const o=db.orders.find(x=>x.id===id); if(!o)return send(res,404,{error:'Order not found'});return send(res,200,{id:o.id,status:o.status,createdAt:o.createdAt,total:o.total,paymentMethod:o.paymentMethod,paymentStatus:o.paymentStatus,items:o.items});
    }
    if(route.startsWith('/api/')) return send(res,404,{error:'API route not found'});
    let file=route==='/'?'index.html':decodeURIComponent(route.slice(1));
    file=path.normalize(file).replace(/^(\.\.[/\\])+/, '');
    const full=path.join(PUBLIC,file);
    if(!full.startsWith(PUBLIC)) return send(res,403,{error:'Forbidden'});
    fs.readFile(full,(err,buf)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found');}
      const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});res.end(buf);
    });
  } catch(e){ console.error(e); send(res,500,{error:'Server error. Please try again.'}); }
});
server.listen(PORT,()=>console.log(`${STORE_NAME} running at http://localhost:${PORT}`));
