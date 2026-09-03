const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const PROTEINAS = ['Carne','Pechuga','Cerdo','Costillas','Mojarra','Trucha'];

router.get('/', auth(['admin','caja']), async (req,res) => {
  try {
    const {fecha} = req.query;
    const dia = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(dia); inicio.setHours(0,0,0,0);
    const fin = new Date(dia); fin.setHours(23,59,59,999);
    const {rows:turnos} = await pool.query('SELECT * FROM turnos WHERE cerrado_en>=$1 AND cerrado_en<=$2 ORDER BY cerrado_en DESC',[inicio,fin]);
    const conteoProteinas = {};
    PROTEINAS.forEach(p=>conteoProteinas[p]=0);
    turnos.forEach(t=>(t.items||[]).forEach(i=>{if(i.proteina&&conteoProteinas[i.proteina]!==undefined)conteoProteinas[i.proteina]++;}));
    const porMesero = {};
    turnos.forEach(t=>{
      const k=t.mesero_nombre||'Sin asignar';
      if(!porMesero[k])porMesero[k]={nombre:k,turnos:[],total:0};
      porMesero[k].turnos.push(t); porMesero[k].total+=t.total;
    });
    res.json({turnos,conteoProteinas,totalDia:turnos.reduce((s,t)=>s+t.total,0),mesasAtendidas:turnos.length,porMesero:Object.values(porMesero)});
  } catch(e){res.status(500).json({error:e.message});}
});

router.get('/mesa/:numero', auth(['admin','caja']), async (req,res) => {
  try {
    const {rows} = await pool.query('SELECT * FROM turnos WHERE mesa_numero=$1 ORDER BY cerrado_en DESC LIMIT 20',[req.params.numero]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
