const express = require('express');
const app = express();

// Almacenamiento en memoria (se borra si el server se reinicia)
const usuarios = {};
const usuariosTotal = new Set();

app.get('/', (req, res) => {
    const ahora = Date.now();
    const cincoMin = 5 * 60 * 1000;
    
    let activosAhora = 0;
    const usuariosHoy = new Set();
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    
    for (const [nombre, datos] of Object.entries(usuarios)) {
        if (ahora - datos.ultimoPing < cincoMin) {
            activosAhora++;
        }
        if (datos.primerPingHoy > inicioHoy.getTime()) {
            usuariosHoy.add(nombre);
        }
    }
    
    res.json({
        activos: activosAhora,
        hoy: usuariosHoy.size,
        total: usuariosTotal.size,
        actualizado: new Date().toLocaleTimeString('es-AR')
    });
});

// Endpoint que llama el script cada vez que alguien lo ejecuta
app.get('/registrar', (req, res) => {
    const nombre = req.query.user || 'Anonimo';
    const ahora = Date.now();
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    
    if (!usuarios[nombre]) {
        usuarios[nombre] = {
            primerPing: ahora,
            primerPingHoy: ahora,
            ultimoPing: ahora
        };
    } else {
        usuarios[nombre].ultimoPing = ahora;
        
        // Si es un día nuevo
        if (usuarios[nombre].primerPingHoy < inicioHoy.getTime()) {
            usuarios[nombre].primerPingHoy = ahora;
        }
    }
    
    usuariosTotal.add(nombre);
    
    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎃 Uzivert API escuchando en puerto ${PORT}`);
});
