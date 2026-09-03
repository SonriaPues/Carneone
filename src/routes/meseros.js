const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth(['admin']), async (req,res) => {
  try { res.json((await pool.query('SELECT id,nombre,usuario,activo,created_at FROM meseros ORDER BY nombre')).rows); }
  catch(e){res.status(500).json({error:e.message});}
});

router.post('/', auth(['admin']), async (req,res) => {
  const {nombre,usuario,password} = req.body;
  try {
    const hash = await bcrypt.hash(password,10);
    const {rows} = await pool.query('INSERT INTO meseros(nombre,usuario,password_hash) VALUES($1,$2,$3) RETURNING id,nombre,usuario,activo',[nombre,usuario,hash]);
    res.json(rows[0]);
  } catch(e){
    if(e.code==='23505') return res.status(400).json({error:'El usuario ya existe'});
    res.status(500).json({error:e.message});
  }
});

router.patch('/:id', auth(['admin']), async (req,res) => {
  const {nombre,usuario,password,activo} = req.body;
  try {
    let q,p;
    if(password){
      const hash = await bcrypt.hash(password,10);
      q='UPDATE meseros SET nombre=$1,usuario=$2,password_hash=$3,activo=$4 WHERE id=$5 RETURNING id,nombre,usuario,activo';
      p=[nombre,usuario,hash,activo,req.params.id];
    } else {
      q='UPDATE meseros SET nombre=$1,usuario=$2,activo=$3 WHERE id=$4 RETURNING id,nombre,usuario,activo';
      p=[nombre,usuario,activo,req.params.id];
    }
    res.json((await pool.query(q,p)).rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id', auth(['admin']), async (req,res) => {
  try { await pool.query('UPDATE meseros SET activo=FALSE WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
