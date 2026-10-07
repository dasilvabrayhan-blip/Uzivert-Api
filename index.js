const express = require('express');
const fs = require('fs');
const app = express();

const ARCHIVO_DATOS = 'datos.json';

// Cargar datos al arrancar
let usuarios = {};
let usuariosTotal = [];

function cargarDatos() {
    try {
        if (fs.existsSync(ARCHIVO_DATOS)) {
            const contenido = fs.readFileSync(ARCHIVO_DATOS, 'utf8');
            const data = JSON.parse(contenido);
            usuarios = data.usuarios || {};
            usuariosTotal = data.usuariosTotal || [];
            console.log(`✅ Datos cargados: ${usuariosTotal.length} usuarios totales`);
        } else {
            console.log('📝 Archivo nuevo, arrancando de cero');
        }
    } catch (e) {
        console.log('❌ Error cargando datos: ' + e.message);
    }
}

function guardarDatos() {
    try {
        const data = {
            usuarios: usuarios,
            usuariosTotal: usuariosTotal
        };
        fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.log('❌ Error guardando datos: ' + e.message);
    }
}

cargarDatos();

app.get('/', (req, res) => {
    const ahora = Date.now();
    const unaHora = 60 * 60 * 1000;
    
    let activosAhora = 0;
    const usuariosHoy = new Set();
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    
    for (const [nombre, datos] of Object.entries(usuarios)) {
        if (ahora - datos.ultimoPing < unaHora) {
            activosAhora++;
        }
        if (datos.primerPingHoy > inicioHoy.getTime()) {
            usuariosHoy.add(nombre);
        }
    }
    
    res.json({
        activos: activosAhora,
        hoy: usuariosHoy.size,
        total: usuariosTotal.length,
        actualizado: new Date().toLocaleTimeString('es-AR')
    });
});

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
        
        if (usuarios[nombre].primerPingHoy < inicioHoy.getTime()) {
            usuarios[nombre].primerPingHoy = ahora;
        }
    }
    
    if (!usuariosTotal.includes(nombre)) {
        usuariosTotal.push(nombre);
    }
    
    guardarDatos();
    
    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎃 Uzivert API escuchando en puerto ${PORT}`);
});
