const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// ═══════════════════════════════════════
// CONFIG SUPABASE
// ═══════════════════════════════════════
const SUPABASE_URL = "https://apxnkrztnvirkgkuxfy.supabase.co";
const SUPABASE_KEY = "sb_publishable_XMVoLklKUy1VW2m_payNDQ_kXPeCiQd";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════
// ENDPOINT PRINCIPAL (contador)
// ═══════════════════════════════════════
app.get('/', async (req, res) => {
    try {
        const ahora = Date.now();
        const unaHora = 60 * 60 * 1000;
        
        const { data: todos, error } = await supabase
            .from('usuarios')
            .select('*');
        
        if (error) {
            return res.json({
                activos: 0,
                hoy: 0,
                total: 0,
                actualizado: new Date().toLocaleTimeString('es-AR'),
                error: "SELECT: " + error.message
            });
        }
        
        let activosAhora = 0;
        const usuariosHoy = new Set();
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        
        for (const usuario of todos) {
            if (ahora - usuario.ultimo_ping < unaHora) {
                activosAhora++;
            }
            if (usuario.primer_ping_hoy > inicioHoy.getTime()) {
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
        
        // Buscar si el usuario ya existe
        const { data: existente, error: errSelect } = await supabase
            .from('usuarios')
            .select('*')
            .eq('nombre', nombre)
            .maybeSingle();
        
        if (errSelect) {
            return res.json({ ok: false, error: "SELECT: " + errSelect.message });
        }
        
        if (existente) {
            // Actualizar
            let primerPingHoy = existente.primer_ping_hoy;
            if (primerPingHoy < inicioHoy.getTime()) {
                primerPingHoy = ahora;
            }
            
            const { error: errUpdate } = await supabase
                .from('usuarios')
                .update({
                    ultimo_ping: ahora,
                    primer_ping_hoy: primerPingHoy
                })
                .eq('nombre', nombre);
            
            if (errUpdate) {
                return res.json({ ok: false, error: "UPDATE: " + errUpdate.message });
            }
        } else {
            // Insertar nuevo
            const { error: errInsert } = await supabase
                .from('usuarios')
                .insert({
                    nombre: nombre,
                    primer_ping: ahora,
                    primer_ping_hoy: ahora,
                    ultimo_ping: ahora
                });
            
            if (errInsert) {
                return res.json({ ok: false, error: "INSERT: " + errInsert.message });
            }
        }
        
        res.json({ ok: true });
    } catch (e) {
        res.json({ ok: false, error: "CATCH: " + e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎃 Uzivert API escuchando en puerto ${PORT}`);
});
