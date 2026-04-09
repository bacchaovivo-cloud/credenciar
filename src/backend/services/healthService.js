import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';
import db from '../config/db.js';
import { StationService } from './stationService.js';

const execAsync = promisify(exec);

export const HealthService = {
    async getFullReport() {
        const uptime = os.uptime();
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const cpuLoad = os.loadavg();
        
        let diskUsage = 'N/A';
        try {
            // Em NodeJS moderno (v18+), fs.statfs fornece métricas seguras do sistema local.
            const { statfs } = await import('fs/promises').catch(() => ({}));
            if (statfs) {
                const stats = await statfs('/');
                diskUsage = `${(stats.bavail * stats.bsize / 1024 / 1024 / 1024).toFixed(2)} GB Free`;
            } else {
                diskUsage = 'N/A (Requer Node.js 18.15+)';
            }
        } catch (e) {
            diskUsage = 'Metrics Unavailable';
        }

        let dbStatus = 'UNKNOWN';
        try {
            await db.query('SELECT 1');
            dbStatus = 'CONNECTED';
        } catch (e) {
            dbStatus = 'DISCONNECTED';
        }

        const stations = StationService.getActiveStations();
        const onlineStations = stations.filter(s => s.isOnline).length;

        return {
            status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
            server: {
                platform: os.platform(),
                uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                cpu: {
                    cores: os.cpus().length,
                    load: cpuLoad
                },
                memory: {
                    free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    usage: (((totalMem - freeMem) / totalMem) * 100).toFixed(1) + '%'
                }
            },
            database: {
                status: dbStatus
            },
            stations: {
                total: stations.length,
                online: onlineStations,
                list: stations
            },
            timestamp: new Date()
        };
    }
};
