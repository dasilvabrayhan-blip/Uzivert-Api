const express = require('express');
const { Pool } = require('pg');
const app = express();

// ═══════════════════════════════════════
// CONFIG NEON (PostgreSQL)
// ═══════════════════════════════════════
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_QiES7b4sIaHd@ep-soft-sun-b6zhldgv-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe (al arrancar)
async function inicializarDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                nombre TEXT PRIMARY KEY,
                primer_ping BIGINT,
                primer_ping_hoy BIGINT,
                ultimo_ping BIGINT
            );
        `);
        console.log('✅ Tabla usuarios lista');
    } catch (e) {
        console.log('❌ Error inicializando DB: ' + e.message);
    }
}
inicializarDB();

// ═══════════════════════════════════════
// ENDPOINT PRINCIPAL (contador)
// ═══════════════════════════════════════
app.get('/', async (req, res) => {
    try {
        const ahora = Date.now();
        const unaHora = 60 * 60 * 1000;
        
        const { rows: todos } = await pool.query('SELECT * FROM usuarios');
        
        let activosAhora = 0;
        const usuariosHoy = new Set();
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        
        for (const usuario of todos) {
            if (ahora - Number(usuario.ultimo_ping) < unaHora) {
                activosAhora++;
            }
            if (Number(usuario.primer_ping_hoy) > inicioHoy.getTime()) {
                usuariosHoy.add(usuario.nombre);
            }
        }
        
        res.json({
            activos: activosAhora,
            hoy: usuariosHoy.size,
            total: todos.length,
            actualizado: new Date().toLocaleTimeString('es-AR')
        });
    } catch (e) {
        res.json({
            activos: 0,
            hoy: 0,
            total: 0,
            actualizado: new Date().toLocaleTimeString('es-AR'),
            error: "CATCH: " + e.message
        });
    }
});

// ═══════════════════════════════════════
// ENDPOINT /registrar (el hub pingea acá)
// ═══════════════════════════════════════
app.get('/registrar', async (req, res) => {
    try {
        const nombre = req.query.user || 'Anonimo';
        const ahora = Date.now();
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        
        const { rows: existentes } = await pool.query(
            'SELECT * FROM usuarios WHERE nombre = $1',
            [nombre]
        );
        
        if (existentes.length > 0) {
            const existente = existentes[0];
            let primerPingHoy = Number(existente.primer_ping_hoy);
            if (primerPingHoy < inicioHoy.getTime()) {
                primerPingHoy = ahora;
            }
            
            await pool.query(
                'UPDATE usuarios SET ultimo_ping = $1, primer_ping_hoy = $2 WHERE nombre = $3',
                [ahora, primerPingHoy, nombre]
            );
        } else {
            await pool.query(
                'INSERT INTO usuarios (nombre, primer_ping, primer_ping_hoy, ultimo_ping) VALUES ($1, $2, $3, $4)',
                [nombre, ahora, ahora, ahora]
            );
        }
        
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false, error: "CATCH: " + e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎃 Uzivert API escuchando en puerto ${PORT}`);
});
