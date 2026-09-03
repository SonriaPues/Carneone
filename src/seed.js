require('dotenv').config();
const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Conectado a Supabase ✓');
    await client.query(`CREATE TABLE IF NOT EXISTS meseros(id SERIAL PRIMARY KEY,nombre TEXT NOT NULL,usuario TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,activo BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS mesas(id SERIAL PRIMARY KEY,numero INTEGER UNIQUE NOT NULL,zona TEXT NOT NULL,estado TEXT NOT NULL DEFAULT 'libre',abierta_en TIMESTAMPTZ,cerrada_en TIMESTAMPTZ,mesero_id INTEGER REFERENCES meseros(id),created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY,mesa_id INTEGER REFERENCES mesas(id) ON DELETE CASCADE,descripcion TEXT NOT NULL,precio INTEGER NOT NULL,proteina TEXT,pagado BOOLEAN DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS turnos(id SERIAL PRIMARY KEY,mesa_numero INTEGER NOT NULL,zona TEXT NOT NULL,mesero_id INTEGER,mesero_nombre TEXT,items JSONB NOT NULL DEFAULT '[]',total INTEGER NOT NULL DEFAULT 0,abierto_en TIMESTAMPTZ,cerrado_en TIMESTAMPTZ DEFAULT NOW());`);
    await client.query(`CREATE TABLE IF NOT EXISTS menu(id SERIAL PRIMARY KEY,proteinas JSONB NOT NULL DEFAULT '{"Carne":true,"Pechuga":true,"Cerdo":true,"Costillas":true,"Mojarra":true,"Trucha":true}',platos JSONB NOT NULL DEFAULT '{"almuerzo":true,"combo":true,"media":true,"frijolada":true,"arroz":true}',updated_at TIMESTAMPTZ DEFAULT NOW());`);
    console.log('Tablas creadas ✓');

    const me = await client.query("SELECT id FROM menu LIMIT 1");
    if (!me.rows.length) { await client.query('INSERT INTO menu DEFAULT VALUES'); console.log('Menú inicial ✓'); }

    const adm = await client.query("SELECT id FROM meseros WHERE usuario='admin'");
    if (!adm.rows.length) {
      const hash = await bcrypt.hash('4carneone',10);
      await client.query("INSERT INTO meseros(nombre,usuario,password_hash) VALUES('Administrador','admin',$1)",[hash]);
      console.log('Mesero admin creado (usuario: admin, clave: 4carneone) ✓');
    }

    const MESAS=[...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(n=>({numero:n,zona:'afuera'})),...[15,16,17,18,19,20].map(n=>({numero:n,zona:'adentro'})),...[21,22,23,24,25,26,27,28,29].map(n=>({numero:n,zona:'cuarto'}))];
    for(const m of MESAS){
      await client.query('INSERT INTO mesas(numero,zona) VALUES($1,$2) ON CONFLICT(numero) DO NOTHING',[m.numero,m.zona]);
      console.log(`Mesa ${m.numero} ✓`);
    }
    console.log('\n✅ Seed completo');
  } catch(e){console.error('Error:',e.message);} finally{client.release();process.exit(0);}
}
seed();
