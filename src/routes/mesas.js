const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth(['mesero','caja','admin']), async (req,res) => {
  try {
    const mesas = await pool.query('SELECT * FROM mesas ORDER BY numero');
    const items = await pool.query('SELECT * FROM items ORDER BY created_at');
    res.json(mesas.rows.map(m => ({...m, items: items.rows.filter(i => i.mesa_id === m.id)})));
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/:numero/items', auth(['mesero']), async (req,res) => {
  const client = await pool.connect();
  try {
    const {descripcion,precio,proteina} = req.body;
    const {rows} = await client.query('SELECT * FROM mesas WHERE numero=$1',[req.params.numero]);
    if (!rows.length) return res.status(404).json({error:'Mesa no encontrada'});
    const mesa = rows[0];
    await client.query('INSERT INTO items(mesa_id,descripcion,precio,proteina) VALUES($1,$2,$3,$4)',[mesa.id,descripcion,precio,proteina||null]);
    if (mesa.estado==='libre') {
      await client.query('UPDATE mesas SET estado=$1,abierta_en=NOW(),mesero_id=$2 WHERE id=$3',['ocupada',req.user.meseroId,mesa.id]);
    }
    const m = await client.query('SELECT * FROM mesas WHERE id=$1',[mesa.id]);
    const its = await client.query('SELECT * FROM items WHERE mesa_id=$1 ORDER BY created_at',[mesa.id]);
    res.json({...m.rows[0], items: its.rows});
  } catch(e){res.status(500).json({error:e.message});} finally{client.release();}
});

router.delete('/:numero/items/:itemId', auth(['mesero']), async (req,res) => {
  const client = await pool.connect();
  try {
    const {rows} = await client.query('SELECT * FROM mesas WHERE numero=$1',[req.params.numero]);
    if (!rows.length) return res.status(404).json({error:'Mesa no encontrada'});
    const mesa = rows[0];
    await client.query('DELETE FROM items WHERE id=$1 AND mesa_id=$2',[req.params.itemId,mesa.id]);
    const cnt = await client.query('SELECT COUNT(*) FROM items WHERE mesa_id=$1',[mesa.id]);
    if (parseInt(cnt.rows[0].count)===0) {
      await client.query('UPDATE mesas SET estado=$1,abierta_en=NULL,mesero_id=NULL WHERE id=$2',['libre',mesa.id]);
    }
    const m = await client.query('SELECT * FROM mesas WHERE id=$1',[mesa.id]);
    const its = await client.query('SELECT * FROM items WHERE mesa_id=$1 ORDER BY created_at',[mesa.id]);
    res.json({...m.rows[0], items: its.rows});
  } catch(e){res.status(500).json({error:e.message});} finally{client.release();}
});

router.patch('/:numero/cobrar', auth(['caja']), async (req,res) => {
  const client = await pool.connect();
  try {
    const {todo,itemIds} = req.body;
    const {rows} = await client.query('SELECT * FROM mesas WHERE numero=$1',[req.params.numero]);
    if (!rows.length) return res.status(404).json({error:'Mesa no encontrada'});
    const mesa = rows[0];

    if (todo) {
      await client.query('UPDATE items SET pagado=TRUE WHERE mesa_id=$1',[mesa.id]);
    } else {
      for (const id of itemIds) await client.query('UPDATE items SET pagado=TRUE WHERE id=$1 AND mesa_id=$2',[id,mesa.id]);
    }

    const pend = await client.query('SELECT COUNT(*) FROM items WHERE mesa_id=$1 AND pagado=FALSE',[mesa.id]);
    const allItems = await client.query('SELECT * FROM items WHERE mesa_id=$1',[mesa.id]);
    const total = allItems.rows.reduce((s,i)=>s+i.precio,0);

    if (parseInt(pend.rows[0].count)===0) {
      let meseroNombre = null;
      if (mesa.mesero_id) {
        const mr = await client.query('SELECT nombre FROM meseros WHERE id=$1',[mesa.mesero_id]);
        meseroNombre = mr.rows[0]?.nombre||null;
      }
      await client.query(
        'INSERT INTO turnos(mesa_numero,zona,mesero_id,mesero_nombre,items,total,abierto_en,cerrado_en) VALUES($1,$2,$3,$4,$5,$6,$7,NOW())',
        [mesa.numero,mesa.zona,mesa.mesero_id,meseroNombre,
         JSON.stringify(allItems.rows.map(i=>({descripcion:i.descripcion,precio:i.precio,proteina:i.proteina}))),
         total,mesa.abierta_en]
      );
      await client.query('DELETE FROM items WHERE mesa_id=$1',[mesa.id]);
      await client.query('UPDATE mesas SET estado=$1,abierta_en=NULL,cerrada_en=NULL,mesero_id=NULL WHERE id=$2',['libre',mesa.id]);
    } else {
      await client.query('UPDATE mesas SET estado=$1 WHERE id=$2',['parcial',mesa.id]);
    }

    const m = await client.query('SELECT * FROM mesas WHERE id=$1',[mesa.id]);
    const its = await client.query('SELECT * FROM items WHERE mesa_id=$1 ORDER BY created_at',[mesa.id]);
    res.json({...m.rows[0], items: its.rows});
  } catch(e){res.status(500).json({error:e.message});} finally{client.release();}
});

module.exports = router;
