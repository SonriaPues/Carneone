const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db/pool');

router.post('/mesero', async (req,res) => {
  const {usuario,password} = req.body;
  try {
    const {rows} = await pool.query('SELECT * FROM meseros WHERE usuario=$1 AND activo=TRUE',[usuario]);
    if (!rows.length) return res.status(401).json({error:'Usuario no encontrado'});
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({error:'Contraseña incorrecta'});
    const token = jwt.sign({rol:'mesero',meseroId:rows[0].id,nombre:rows[0].nombre},process.env.JWT_SECRET,{expiresIn:'12h'});
    res.json({token,rol:'mesero',nombre:rows[0].nombre,meseroId:rows[0].id});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/caja', (req,res) => {
  if (req.body.clave !== process.env.CLAVE_CAJA) return res.status(401).json({error:'Contraseña incorrecta'});
  const token = jwt.sign({rol:'caja'},process.env.JWT_SECRET,{expiresIn:'12h'});
  res.json({token,rol:'caja'});
});

router.post('/admin', (req,res) => {
  if (req.body.clave !== process.env.CLAVE_ADMIN) return res.status(401).json({error:'Contraseña incorrecta'});
  const token = jwt.sign({rol:'admin'},process.env.JWT_SECRET,{expiresIn:'12h'});
  res.json({token,rol:'admin'});
});

module.exports = router;
