const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.get('/', auth(['mesero','caja','admin']), async (req,res) => {
  try {
    let {rows} = await pool.query('SELECT * FROM menu LIMIT 1');
    if (!rows.length){const ins=await pool.query('INSERT INTO menu DEFAULT VALUES RETURNING *');rows=ins.rows;}
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

router.patch('/', auth(['admin']), async (req,res) => {
  try {
    let {rows} = await pool.query('SELECT * FROM menu LIMIT 1');
    if (!rows.length){const ins=await pool.query('INSERT INTO menu DEFAULT VALUES RETURNING *');rows=ins.rows;}
    const menu=rows[0];
    const {proteinas,platos}=req.body;
    const np={...menu.proteinas,...(proteinas||{})};
    const npl={...menu.platos,...(platos||{})};
    const up=await pool.query('UPDATE menu SET proteinas=$1,platos=$2,updated_at=NOW() WHERE id=$3 RETURNING *',[JSON.stringify(np),JSON.stringify(npl),menu.id]);
    res.json(up.rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
