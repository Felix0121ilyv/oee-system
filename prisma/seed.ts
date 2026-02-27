import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // System Config
    await prisma.systemConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            oeeGoal: 0.85,
            stopCostPerMin: 50,
            defectCostPerUnit: 15,
            productionValuePerUnit: 25,
            shifts: JSON.stringify(['MORNING', 'AFTERNOON', 'NIGHT']),
            stopReasons: JSON.stringify([
                'Falla mecánica',
                'Falla eléctrica',
                'Falta de material',
                'Cambio de formato',
                'Mantenimiento preventivo',
                'Operador ausente',
                'Problema de calidad',
                'Otro',
            ]),
        },
    });

    // Users
    const adminPass = await bcrypt.hash('Admin123!', 10);
    const supPass = await bcrypt.hash('Super123!', 10);
    const opPass = await bcrypt.hash('Op123!', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@oee.com' },
        update: {},
        create: { name: 'Carlos Administrador', email: 'admin@oee.com', password: adminPass, role: 'ADMIN' },
    });
    const supervisor = await prisma.user.upsert({
        where: { email: 'supervisor@oee.com' },
        update: {},
        create: { name: 'María Supervisora', email: 'supervisor@oee.com', password: supPass, role: 'SUPERVISOR' },
    });
    const operator = await prisma.user.upsert({
        where: { email: 'operador@oee.com' },
        update: {},
        create: { name: 'Luis Operador', email: 'operador@oee.com', password: opPass, role: 'OPERATOR' },
    });

    console.log('✅ Users created');

    // Machines
    const machinesData = [
        { name: 'Línea A - Ensamble', area: 'Producción', idealSpeed: 80, plannedTime: 480 },
        { name: 'Línea B - Pintura', area: 'Acabados', idealSpeed: 60, plannedTime: 480 },
        { name: 'CNC-01', area: 'Mecanizado', idealSpeed: 45, plannedTime: 480 },
        { name: 'Prensa H-200', area: 'Estampado', idealSpeed: 120, plannedTime: 480 },
        { name: 'Inyectora PL-5', area: 'Plásticos', idealSpeed: 90, plannedTime: 480 },
    ];

    const machines: any[] = [];
    for (const m of machinesData) {
        const existing = await prisma.machine.findFirst({ where: { name: m.name } });
        if (existing) {
            machines.push(existing);
        } else {
            const created = await prisma.machine.create({ data: m });
            machines.push(created);
        }
    }

    console.log('✅ Machines created');

    // Production records and stoppages for last 30 days
    const shifts = ['MORNING', 'AFTERNOON', 'NIGHT'];
    const stopReasons = [
        'Falla mecánica',
        'Falla eléctrica',
        'Falta de material',
        'Cambio de formato',
        'Mantenimiento preventivo',
        'Operador ausente',
        'Problema de calidad',
    ];
    const stopTypes = ['PLANNED', 'UNPLANNED'];

    // Base performance profiles per machine (0-1 scale)
    const machineProfiles = [
        { availFactor: 0.91, perfFactor: 0.88, qualFactor: 0.96 }, // Línea A - good
        { availFactor: 0.72, perfFactor: 0.79, qualFactor: 0.88 }, // Línea B - average
        { availFactor: 0.95, perfFactor: 0.92, qualFactor: 0.97 }, // CNC-01 - excellent
        { availFactor: 0.60, perfFactor: 0.71, qualFactor: 0.82 }, // Prensa H-200 - poor
        { availFactor: 0.84, perfFactor: 0.86, qualFactor: 0.93 }, // Inyectora - good
    ];

    const users = [admin, supervisor, operator];

    for (let day = 29; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);

        for (let mi = 0; mi < machines.length; mi++) {
            const machine = machines[mi];
            const profile = machineProfiles[mi];

            // 2 shifts per machine per day
            for (let si = 0; si < 2; si++) {
                const shift = shifts[si];
                const variance = (Math.random() - 0.5) * 0.1;
                const avail = Math.min(1, Math.max(0.4, profile.availFactor + variance));
                const perf = Math.min(1, Math.max(0.4, profile.perfFactor + variance));
                const qual = Math.min(1, Math.max(0.7, profile.qualFactor + (Math.random() - 0.5) * 0.05));

                const operativeTime = machine.plannedTime * avail;
                const idealProd = machine.idealSpeed * operativeTime;
                const totalProduction = Math.round(idealProd * perf);
                const defects = Math.round(totalProduction * (1 - qual));

                const user = users[Math.floor(Math.random() * users.length)];

                // Check if record already exists
                const exists = await prisma.productionRecord.findFirst({
                    where: { machineId: machine.id, date, shift },
                });
                if (!exists) {
                    await prisma.productionRecord.create({
                        data: {
                            machineId: machine.id,
                            userId: user.id,
                            date,
                            shift,
                            totalProduction,
                            defects,
                            operativeTime,
                        },
                    });
                }

                // Add stoppages (1-3 per shift with some probability)
                if (Math.random() > 0.4) {
                    const numStops = Math.floor(Math.random() * 3) + 1;
                    for (let k = 0; k < numStops; k++) {
                        const duration = Math.round((Math.random() * 40 + 5) * 10) / 10;
                        const reason = stopReasons[Math.floor(Math.random() * stopReasons.length)];
                        const type = stopTypes[Math.floor(Math.random() * stopTypes.length)];

                        const stopExists = await prisma.stoppage.findFirst({
                            where: { machineId: machine.id, date, reason, type },
                        });
                        if (!stopExists) {
                            await prisma.stoppage.create({
                                data: {
                                    machineId: machine.id,
                                    userId: user.id,
                                    reason,
                                    type,
                                    duration,
                                    date,
                                    observations: Math.random() > 0.6 ? `Observación registrada el turno ${shift}` : null,
                                },
                            });
                        }
                    }
                }
            }
        }
    }

    console.log('✅ Production records and stoppages created');
    console.log('\n🎉 Seed complete! Demo credentials:');
    console.log('  Admin:      admin@oee.com     / Admin123!');
    console.log('  Supervisor: supervisor@oee.com / Super123!');
    console.log('  Operador:   operador@oee.com  / Op123!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
